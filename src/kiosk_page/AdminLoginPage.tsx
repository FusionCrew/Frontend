import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLoginPage: React.FC = () => {
    const [adminId, setAdminId] = useState('');
    const [password, setPassword] = useState('');
    const [showError, setShowError] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/v1/admin/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: adminId, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminId', adminId);
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                window.location.href = '/admin/index.html';
            } else {
                setShowError(true);
            }
        } catch (err) {
            console.error('Login failed:', err);
            setShowError(true);
        }
    };

    return (
        <div className="login-page-container">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
            <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />

            <div className="login-card">
                <div className="login-header">
                    <h1>Get Started Now</h1>
                    <p>서비스 이용을 위해 로그인해 주세요.</p>
                </div>

                <div className="login-form-area">
                    <form id="loginForm" onSubmit={handleLogin}>
                        <div className="form-group">
                            <div className="input-wrapper">
                                <span className="material-symbols-outlined icon">person_outline</span>
                                <input
                                    id="adminId"
                                    type="text"
                                    placeholder="아이디를 입력하세요"
                                    value={adminId}
                                    onChange={(e) => setAdminId(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="input-wrapper">
                                <span className="material-symbols-outlined icon">lock_outline</span>
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="비밀번호를 입력하세요"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        <div id="errorMessage" className={`error-message ${showError ? 'show' : ''}`}>
                            <span className="material-symbols-outlined">error</span>
                            <p>아이디 또는 비밀번호가 올바르지 않습니다.</p>
                        </div>

                        <button type="submit" className="login-btn">로그인</button>
                    </form>

                    <div className="register-link">
                        <a href="/admin/register.html">또는 회원가입</a>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .login-page-container {
            font-family: "Work Sans", "Noto Sans KR", sans-serif;
            background-color: #f0f0f0;
            min-height: 100vh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 9999;
        }

        .login-card {
            background: #ffffff;
            border-radius: 32px;
            padding: 100px 100px 80px;
            width: 100%;
            max-width: 900px;
            min-height: 720px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .login-header {
            text-align: center;
            margin-bottom: 60px;
            width: 100%;
        }

        .login-header h1 {
            font-size: 70px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 16px;
            letter-spacing: 1px;
        }

        .login-header p {
            font-size: 20px;
            color: #999999;
            font-weight: 400;
        }

        .login-form-area {
            width: 100%;
            max-width: 620px;
            margin: 0 auto;
        }

        .form-group {
            margin-bottom: 18px;
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .input-wrapper .icon {
            position: absolute;
            left: 20px;
            color: #b0b0b0;
            font-size: 28px;
            pointer-events: none;
        }

        .input-wrapper input {
            width: 100%;
            height: 70px;
            padding: 0 24px 0 60px;
            border: 1.5px solid #e0e0e0;
            border-radius: 10px;
            font-size: 22px;
            font-family: "Noto Sans KR", sans-serif;
            color: #333;
            background: #fff;
            outline: none;
            transition: border-color 0.2s ease;
        }

        .input-wrapper input:focus {
            border-color: #DC2626;
        }

        .login-btn {
            width: 100%;
            height: 62px;
            margin-top: 12px;
            background-color: #DC2626;
            color: #ffffff;
            border: none;
            border-radius: 10px;
            font-size: 24px;
            font-weight: 700;
            font-family: "Noto Sans KR", sans-serif;
            cursor: pointer;
            transition: background-color 0.2s ease, transform 0.1s ease;
        }

        .login-btn:hover {
            background-color: #b91c1c;
        }

        .login-btn:active {
            transform: scale(0.98);
        }

        .register-link {
            text-align: center;
            margin-top: 28px;
        }

        .register-link a {
            font-size: 20px;
            color: #888;
            text-decoration: underline;
            text-underline-offset: 6px;
            font-family: "Noto Sans KR", sans-serif;
        }

        .error-message {
            display: none;
            align-items: center;
            gap: 8px;
            padding: 14px 16px;
            background-color: #fef2f2;
            color: #DC2626;
            border-radius: 10px;
            border: 1px solid #fecaca;
            margin-bottom: 12px;
            font-size: 16px;
            font-weight: 600;
        }

        .error-message.show {
            display: flex;
        }
      `}} />
        </div>
    );
};

export default AdminLoginPage;
