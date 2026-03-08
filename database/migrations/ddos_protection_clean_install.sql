-- Полная очистка и переустановка защиты от DDoS
-- ВНИМАНИЕ: Этот скрипт удалит все существующие данные о rate limits!

-- Удаляем функции
DROP FUNCTION IF EXISTS check_rate_limit(UUID, INET, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS detect_spam_pattern(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS cleanup_rate_limits();
DROP FUNCTION IF EXISTS check_message_spam();

-- Удаляем политики
DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Users can view own suspicious activity" ON suspicious_activity;

-- Удаляем таблицы (CASCADE удалит все зависимости)
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS suspicious_activity CASCADE;

-- Теперь создаем всё заново
-- Таблица для отслеживания rate limits
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    action_type TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, ip_address, action_type, window_start)
);

CREATE INDEX idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX idx_rate_limits_ip_address ON rate_limits(ip_address);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);
CREATE INDEX idx_rate_limits_blocked_until ON rate_limits(blocked_until);

-- Таблица для логирования подозрительной активности
CREATE TABLE suspicious_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    activity_type TEXT NOT NULL,
    details JSONB,
    severity TEXT DEFAULT 'medium',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_suspicious_activity_user_id ON suspicious_activity(user_id);
CREATE INDEX idx_suspicious_activity_ip_address ON suspicious_activity(ip_address);
CREATE INDEX idx_suspicious_activity_detected_at ON suspicious_activity(detected_at DESC);
CREATE INDEX idx_suspicious_activity_resolved ON suspicious_activity(resolved);

-- RLS политики
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
    ON rate_limits FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view own suspicious activity"
    ON suspicious_activity FOR SELECT
    USING (user_id = auth.uid());

-- Функция проверки rate limit
CREATE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_ip_address INET,
    p_action_type TEXT,
    p_max_requests INTEGER,
    p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_blocked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT blocked_until INTO v_blocked_until
    FROM rate_limits
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND action_type = p_action_type
    AND blocked_until > NOW()
    ORDER BY blocked_until DESC
    LIMIT 1;
    
    IF v_blocked_until IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    
    v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    
    SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
    FROM rate_limits
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND action_type = p_action_type
    AND window_start >= v_window_start;
    
    IF v_current_count >= p_max_requests THEN
        INSERT INTO rate_limits (user_id, ip_address, action_type, request_count, blocked_until)
        VALUES (p_user_id, p_ip_address, p_action_type, 1, NOW() + (p_window_seconds || ' seconds')::INTERVAL)
        ON CONFLICT (user_id, ip_address, action_type, window_start) 
        DO UPDATE SET 
            request_count = rate_limits.request_count + 1,
            blocked_until = NOW() + (p_window_seconds || ' seconds')::INTERVAL;
        
        INSERT INTO suspicious_activity (user_id, ip_address, activity_type, details, severity)
        VALUES (
            p_user_id, 
            p_ip_address, 
            'rate_limit_exceeded',
            jsonb_build_object(
                'action_type', p_action_type,
                'request_count', v_current_count,
                'max_requests', p_max_requests,
                'window_seconds', p_window_seconds
            ),
            CASE 
                WHEN v_current_count > p_max_requests * 3 THEN 'critical'
                WHEN v_current_count > p_max_requests * 2 THEN 'high'
                ELSE 'medium'
            END
        );
        
        RETURN FALSE;
    END IF;
    
    INSERT INTO rate_limits (user_id, ip_address, action_type, request_count, window_start)
    VALUES (p_user_id, p_ip_address, p_action_type, 1, NOW())
    ON CONFLICT (user_id, ip_address, action_type, window_start) 
    DO UPDATE SET request_count = rate_limits.request_count + 1;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция автоматической очистки
CREATE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';
    DELETE FROM suspicious_activity WHERE resolved = TRUE AND resolved_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии
COMMENT ON TABLE rate_limits IS 'Отслеживание rate limits для защиты от DDoS';
COMMENT ON TABLE suspicious_activity IS 'Логирование подозрительной активности';
COMMENT ON FUNCTION check_rate_limit IS 'Проверка rate limit для действия пользователя';
COMMENT ON FUNCTION cleanup_rate_limits IS 'Автоматическая очистка старых записей';

-- Готово!
SELECT 'DDoS protection installed successfully!' AS status;
