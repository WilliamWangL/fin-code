package com.fincode.api.application.service;

import com.fincode.api.config.AuthProperties;
import com.fincode.api.domain.enums.OrganizationRole;
import com.fincode.api.domain.enums.UserStatus;
import com.fincode.api.domain.model.Organization;
import com.fincode.api.domain.model.OrganizationMember;
import com.fincode.api.domain.model.PasswordResetToken;
import com.fincode.api.domain.model.RefreshToken;
import com.fincode.api.domain.model.UserAccount;
import com.fincode.api.domain.repository.OrganizationMemberRepository;
import com.fincode.api.domain.repository.OrganizationRepository;
import com.fincode.api.domain.repository.PasswordResetTokenRepository;
import com.fincode.api.domain.repository.RefreshTokenRepository;
import com.fincode.api.domain.repository.UserAccountRepository;
import com.fincode.api.dto.AuthDtos.AuthTokens;
import com.fincode.api.dto.AuthDtos.LoginData;
import com.fincode.api.dto.AuthDtos.LogoutData;
import com.fincode.api.dto.AuthDtos.MeData;
import com.fincode.api.dto.AuthDtos.PasswordResetConfirmData;
import com.fincode.api.dto.AuthDtos.PasswordResetRequestData;
import com.fincode.api.dto.AuthDtos.RegisterData;
import com.fincode.api.dto.OrganizationDtos.OrganizationData;
import com.fincode.api.exception.ApiException;
import com.fincode.api.exception.ErrorCode;
import com.fincode.api.mapper.AccountMapper;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Developer account lifecycle (spec §24/§45, FIN-003): register, login, logout,
 * refresh rotation and password reset. Access tokens are JWTs; refresh tokens
 * are opaque and stored hashed.
 */
@Service
public class AuthService {

    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int TOKEN_BYTES = 32;

    private final UserAccountRepository userAccountRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository memberRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthProperties authProperties;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserAccountRepository userAccountRepository,
                       OrganizationRepository organizationRepository,
                       OrganizationMemberRepository memberRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthProperties authProperties) {
        this.userAccountRepository = userAccountRepository;
        this.organizationRepository = organizationRepository;
        this.memberRepository = memberRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authProperties = authProperties;
    }

    /** Registers an account and its personal organization (the user becomes OWNER). */
    @Transactional
    public RegisterData register(String email, String password, String name) {
        String normalizedEmail = normalizeEmail(email);
        requirePassword(password);
        if (userAccountRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ApiException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        UserAccount user = new UserAccount();
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setName(name == null || name.isBlank() ? null : name.trim());
        user = userAccountRepository.save(user);

        Organization organization = new Organization();
        organization.setName(user.getName() != null ? user.getName() + "'s Organization" : "Personal Organization");
        organization.setSlug(uniqueSlug());
        organization = organizationRepository.save(organization);

        OrganizationMember membership = new OrganizationMember();
        membership.setOrganizationId(organization.getId());
        membership.setUserId(user.getId());
        membership.setRole(OrganizationRole.OWNER);
        memberRepository.save(membership);

        AuthTokens tokens = issueTokens(user, organization.getId(), OrganizationRole.OWNER);
        return new RegisterData(AccountMapper.toUserData(user),
                AccountMapper.toOrganizationData(organization, OrganizationRole.OWNER), tokens);
    }

    @Transactional
    public LoginData login(String email, String password) {
        UserAccount user = userAccountRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CREDENTIALS));
        if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(ErrorCode.FORBIDDEN, "The account is not active");
        }
        user.setLastLoginAt(LocalDateTime.now(ZoneOffset.UTC));
        OrganizationMember membership = primaryMembership(user.getId());
        return new LoginData(AccountMapper.toUserData(user), issueTokens(user,
                membership == null ? null : membership.getOrganizationId(),
                membership == null ? null : membership.getRole()));
    }

    /** Rotates a refresh token: the presented token is revoked and a new pair is issued. */
    @Transactional
    public AuthTokens refresh(String refreshTokenValue) {
        if (refreshTokenValue == null || refreshTokenValue.isBlank()) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED);
        }
        RefreshToken token = refreshTokenRepository.findByTokenHash(ApiKeyService.hash(refreshTokenValue.trim()))
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_EXPIRED));
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (token.getRevokedAt() != null || !token.getExpiresAt().isAfter(now)) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED);
        }
        token.setRevokedAt(now);
        UserAccount user = userAccountRepository.findById(token.getUserId())
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_EXPIRED));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(ErrorCode.FORBIDDEN, "The account is not active");
        }
        OrganizationMember membership = primaryMembership(user.getId());
        return issueTokens(user,
                membership == null ? null : membership.getOrganizationId(),
                membership == null ? null : membership.getRole());
    }

    /** Revokes the presented refresh token when it belongs to the caller. Idempotent. */
    @Transactional
    public LogoutData logout(Long userId, String refreshTokenValue) {
        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            refreshTokenRepository.findByTokenHash(ApiKeyService.hash(refreshTokenValue.trim()))
                    .filter(token -> Objects.equals(token.getUserId(), userId))
                    .filter(token -> token.getRevokedAt() == null)
                    .ifPresent(token -> token.setRevokedAt(LocalDateTime.now(ZoneOffset.UTC)));
        }
        return new LogoutData(true);
    }

    @Transactional(readOnly = true)
    public MeData me(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "The account does not exist"));
        List<OrganizationData> organizations = memberRepository.findByUserId(userId).stream()
                .sorted(Comparator.comparing(OrganizationMember::getId))
                .map(membership -> organizationRepository.findById(membership.getOrganizationId())
                        .map(organization -> AccountMapper.toOrganizationData(organization, membership.getRole()))
                        .orElse(null))
                .filter(Objects::nonNull)
                .toList();
        return new MeData(AccountMapper.toUserData(user), organizations);
    }

    /**
     * Creates a single-use reset token. The response never reveals whether the
     * account exists; the token itself is echoed only in local/development
     * profiles until email delivery is implemented.
     */
    @Transactional
    public PasswordResetRequestData requestPasswordReset(String email) {
        UserAccount user = userAccountRepository.findByEmail(normalizeEmail(email)).orElse(null);
        if (user == null) {
            return new PasswordResetRequestData(null);
        }
        String rawToken = randomToken();
        PasswordResetToken token = new PasswordResetToken();
        token.setUserId(user.getId());
        token.setTokenHash(ApiKeyService.hash(rawToken));
        token.setExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plus(authProperties.getPasswordResetTtl()));
        passwordResetTokenRepository.save(token);
        return new PasswordResetRequestData(authProperties.isExposeResetToken() ? rawToken : null);
    }

    /** Consumes a reset token, updates the password and revokes all refresh tokens. */
    @Transactional
    public PasswordResetConfirmData confirmPasswordReset(String rawToken, String newPassword) {
        requirePassword(newPassword);
        PasswordResetToken token = passwordResetTokenRepository
                .findByTokenHash(ApiKeyService.hash(rawToken.trim()))
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_EXPIRED));
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (token.getUsedAt() != null || !token.getExpiresAt().isAfter(now)) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED);
        }
        UserAccount user = userAccountRepository.findById(token.getUserId())
                .orElseThrow(() -> new ApiException(ErrorCode.TOKEN_EXPIRED));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        token.setUsedAt(now);
        refreshTokenRepository.revokeAllForUser(user.getId(), now);
        return new PasswordResetConfirmData(true);
    }

    private AuthTokens issueTokens(UserAccount user, Long organizationId, OrganizationRole role) {
        String accessToken = jwtService.createAccessToken(user.getId(), organizationId, role);
        String refreshValue = randomToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(user.getId());
        refreshToken.setTokenHash(ApiKeyService.hash(refreshValue));
        refreshToken.setExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plus(authProperties.getRefreshTokenTtl()));
        refreshTokenRepository.save(refreshToken);
        return new AuthTokens(accessToken, refreshValue, "Bearer", jwtService.accessTokenTtlSeconds());
    }

    private OrganizationMember primaryMembership(Long userId) {
        return memberRepository.findByUserId(userId).stream()
                .min(Comparator.comparing((OrganizationMember member) -> member.getRole().ordinal())
                        .thenComparing(OrganizationMember::getId))
                .orElse(null);
    }

    private String uniqueSlug() {
        String slug;
        do {
            slug = "org-" + HexFormat.of().formatHex(randomBytes(6));
        } while (organizationRepository.existsBySlug(slug));
        return slug;
    }

    private String randomToken() {
        return HexFormat.of().formatHex(randomBytes(TOKEN_BYTES));
    }

    private byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        random.nextBytes(bytes);
        return bytes;
    }

    private void requirePassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new ApiException(ErrorCode.INVALID_REQUEST,
                    "The password must be at least " + MIN_PASSWORD_LENGTH + " characters");
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
