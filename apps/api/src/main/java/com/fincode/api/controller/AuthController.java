package com.fincode.api.controller;

import com.fincode.api.application.service.AuthPrincipal;
import com.fincode.api.application.service.AuthService;
import com.fincode.api.config.JwtAuthFilter;
import com.fincode.api.dto.ApiResponse;
import com.fincode.api.dto.AuthDtos.AuthTokens;
import com.fincode.api.dto.AuthDtos.LoginData;
import com.fincode.api.dto.AuthDtos.LoginRequest;
import com.fincode.api.dto.AuthDtos.LogoutData;
import com.fincode.api.dto.AuthDtos.LogoutRequest;
import com.fincode.api.dto.AuthDtos.MeData;
import com.fincode.api.dto.AuthDtos.PasswordResetConfirmData;
import com.fincode.api.dto.AuthDtos.PasswordResetConfirmRequest;
import com.fincode.api.dto.AuthDtos.PasswordResetRequest;
import com.fincode.api.dto.AuthDtos.PasswordResetRequestData;
import com.fincode.api.dto.AuthDtos.RefreshRequest;
import com.fincode.api.dto.AuthDtos.RegisterData;
import com.fincode.api.dto.AuthDtos.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Developer account auth endpoints (FIN-003). Register, login, refresh and
 * password reset are public; logout and me require a JWT access token.
 */
@RestController
@RequestMapping("/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<RegisterData> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.of(authService.register(request.email(), request.password(), request.name()));
    }

    @PostMapping("/login")
    public ApiResponse<LoginData> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.of(authService.login(request.email(), request.password()));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthTokens> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.of(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ApiResponse<LogoutData> logout(@RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal,
                                          @RequestBody(required = false) LogoutRequest request) {
        return ApiResponse.of(authService.logout(principal.userId(),
                request == null ? null : request.refreshToken()));
    }

    @GetMapping("/me")
    public ApiResponse<MeData> me(@RequestAttribute(JwtAuthFilter.ATTRIBUTE) AuthPrincipal principal) {
        return ApiResponse.of(authService.me(principal.userId()));
    }

    @PostMapping("/password-reset/request")
    public ApiResponse<PasswordResetRequestData> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        return ApiResponse.of(authService.requestPasswordReset(request.email()));
    }

    @PostMapping("/password-reset/confirm")
    public ApiResponse<PasswordResetConfirmData> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmRequest request) {
        return ApiResponse.of(authService.confirmPasswordReset(request.token(), request.newPassword()));
    }
}
