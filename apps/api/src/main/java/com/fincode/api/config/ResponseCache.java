package com.fincode.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Small JSON response cache on top of Redis (spec §42, FIN-012). Values are
 * serialized with the application ObjectMapper, so any DTO can be cached by
 * key with a TTL. Redis failures fail open: a failed read is a cache miss and
 * the caller falls through to the database, keeping the API available.
 * Invalidation happens via TTL expiry plus explicit {@link #evict(String)}
 * calls from dataset refresh jobs.
 */
@Component
public class ResponseCache {

    private static final Logger log = LoggerFactory.getLogger(ResponseCache.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public ResponseCache(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public <T> T get(String key, Class<T> type) {
        try {
            String json = redis.opsForValue().get(key);
            return json == null ? null : objectMapper.readValue(json, type);
        } catch (Exception exception) {
            log.warn("Cache read failed [{}]: {}", key, exception.getMessage());
            return null;
        }
    }

    public <T> List<T> getList(String key, Class<T> elementType) {
        try {
            String json = redis.opsForValue().get(key);
            if (json == null) {
                return null;
            }
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, elementType));
        } catch (Exception exception) {
            log.warn("Cache read failed [{}]: {}", key, exception.getMessage());
            return null;
        }
    }

    public void put(String key, Object value, Duration ttl) {
        try {
            redis.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (Exception exception) {
            log.warn("Cache write failed [{}]: {}", key, exception.getMessage());
        }
    }

    /** Removes an exact key, or every key matching a prefix when it ends with '*'. */
    public void evict(String key) {
        try {
            if (key.endsWith("*")) {
                Set<String> keys = redis.keys(key);
                if (keys != null && !keys.isEmpty()) {
                    redis.delete(keys);
                }
            } else {
                redis.delete(key);
            }
        } catch (Exception exception) {
            log.warn("Cache eviction failed [{}]: {}", key, exception.getMessage());
        }
    }
}
