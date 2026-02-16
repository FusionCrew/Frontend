import React from 'react';
import { useNavigate } from 'react-router-dom';

const GatePage: React.FC = () => {
    const navigate = useNavigate();

    const handleNavigation = (id: string) => {
        if (id === 'kiosk') {
            navigate('/kiosk');
        } else if (id === 'kiosk-v2') {
            navigate('/kiosk/v2');
        } else if (id === 'admin') {
            navigate('/admin/login');
        }
    };

    return (
        <div className="gate-page-container">
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
            <link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet" />

            <div className="gate-card">
                <div className="gate-header">
                    <h1>PREMIUM BURGER</h1>
                    <p>서비스를 선택해 주세요.</p>
                </div>

                <div className="gate-options">
                    <button
                        className="gate-option-card admin-option"
                        onClick={() => handleNavigation('admin')}
                    >
                        <div className="option-icon">
                            <span className="material-symbols-outlined">admin_panel_settings</span>
                        </div>
                        <div className="option-info">
                            <span className="option-label">관리자</span>
                            <span className="option-desc">Admin Portal</span>
                        </div>
                        <span className="material-symbols-outlined arrow">chevron_right</span>
                    </button>

                    <button
                        className="gate-option-card kiosk-option"
                        onClick={() => handleNavigation('kiosk')}
                    >
                        <div className="option-icon">
                            <span className="material-symbols-outlined">desktop_windows</span>
                        </div>
                        <div className="option-info">
                            <span className="option-label">키오스크</span>
                            <span className="option-desc">Kiosk Mode</span>
                        </div>
                        <span className="material-symbols-outlined arrow">chevron_right</span>
                    </button>

                    <button
                        className="gate-option-card kiosk-v2-option"
                        onClick={() => handleNavigation('kiosk-v2')}
                    >
                        <div className="option-icon">
                            <span className="material-symbols-outlined">auto_awesome</span>
                        </div>
                        <div className="option-info">
                            <span className="option-label">키오스크 v2</span>
                            <span className="option-desc">Design Preview</span>
                        </div>
                        <span className="material-symbols-outlined arrow">chevron_right</span>
                    </button>
                </div>
            </div>

            <div className="footer-info">
                © 2026 PREMIUM BURGER. All rights reserved.
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .gate-page-container {
            font-family: "Work Sans", "Noto Sans KR", sans-serif;
            background-color: #f0f0f0;
            min-height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            position: fixed; /* Fix for alignment */
            top: 0;
            left: 0;
            z-index: 9999;
        }

        .gate-card {
            background: #ffffff;
            border-radius: 32px;
            padding: 80px 60px;
            width: 100%;
            max-width: 800px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .gate-header {
            text-align: center;
            margin-bottom: 60px;
        }

        .gate-header h1 {
            font-size: 56px;
            font-weight: 700;
            color: #DC2626;
            margin-bottom: 8px;
            letter-spacing: -2px;
        }

        .gate-header p {
            font-size: 18px;
            color: #999999;
            font-weight: 400;
        }

        .gate-options {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .gate-option-card {
            width: 100%;
            background: #ffffff;
            border: 1.5px solid #e0e0e0;
            border-radius: 20px;
            padding: 30px 40px;
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
            position: relative;
            outline: none;
        }

        .gate-option-card:hover {
            border-color: #DC2626;
            transform: translateY(-4px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.04);
        }

        .gate-option-card:active {
            transform: scale(0.98);
        }

        .option-icon {
            width: 64px;
            height: 64px;
            background: #fef2f2;
            color: #DC2626;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 24px;
        }

        .option-icon .material-symbols-outlined {
            font-size: 32px;
        }

        .option-info {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        }

        .option-label {
            font-size: 24px;
            font-weight: 700;
            color: #333;
            margin-bottom: 2px;
        }

        .option-desc {
            font-size: 14px;
            color: #999;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .arrow {
            color: #e0e0e0;
            font-size: 24px;
            transition: transform 0.3s ease, color 0.3s ease;
        }

        .gate-option-card:hover .arrow {
            transform: translateX(5px);
            color: #DC2626;
        }

        .footer-info {
            margin-top: 40px;
            font-size: 14px;
            color: #bbb;
            font-weight: 500;
        }

        /* Accent for Admin */
        .admin-option {
            background: #fffafa;
            border-color: #fecaca;
        }

        /* Accent for Kiosk v2 */
        .kiosk-v2-option {
            background: #f0f9ff;
            border-color: #bae6fd;
        }
      `}} />
        </div>
    );
};

export default GatePage;
