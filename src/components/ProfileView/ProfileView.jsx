import React, { useEffect, useState } from 'react';

function getConfig(key) {
    return window.electronAPI.getConfig(key);
}

function setConfig(key, value) {
    return window.electronAPI.setConfig(key, value);
}

function ProfileView() {
    // 状态变量
    const [avatarPath, setAvatarPath] = useState('');
    const [username, setUsername] = useState('');
    const [bbsToken, setBbsToken] = useState('');
    const [bbsSid, setBbsSid] = useState('');
    const [message, setMessage] = useState('');

    // 通过 ipcRenderer 发送消息给主进程
    useEffect(() => {
        async function fetchConfig() {
            const avatar = await getConfig('avatar_path');
            setAvatarPath(avatar || '');

            const name = await getConfig('user_name');
            setUsername(name || '');

            const token = await getConfig('hifini_cookie.bbs_token');
            setBbsToken(token || '');

            const sid = await getConfig('hifini_cookie.bbs_sid');
            setBbsSid(sid || '');
        }

        fetchConfig();
    }, []);

    // 保存按钮的处理函数
    const handleSave = async () => {
        await setConfig('avatar_path', avatarPath);
        await setConfig('user_name', username);
        await setConfig('hifini_cookie.bbs_token', bbsToken);
        await setConfig('hifini_cookie.bbs_sid', bbsSid);
        setMessage('已保存');
    };

    // 处理头像文件选择
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarPath(file.path);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-4xl font-bold mb-8">个人资料</h1>

            <div className="mb-8">
                <h2 className="text-xl font-bold mb-2">头像</h2>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="bg-gray-700 text-white px-4 py-2 rounded"
                />
                {avatarPath && (
                    <img
                        src={`file://${avatarPath}`}
                        alt="Avatar"
                        className="mt-4 w-24 h-24 rounded-full"
                    />
                )}
            </div>

            <div className="mb-8">
                <label className="block text-gray-400 mb-2">用户名:</label>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-gray-700 text-white px-4 py-2 rounded w-full"
                />
            </div>

            <div className="mb-8">
                <label className="block text-gray-400 mb-2">bbs_token:</label>
                <input
                    type="text"
                    value={bbsToken}
                    onChange={(e) => setBbsToken(e.target.value)}
                    className="bg-gray-700 text-white px-4 py-2 rounded w-full"
                />
            </div>

            <div className="mb-8">
                <label className="block text-gray-400 mb-2">bbs_sid:</label>
                <input
                    type="text"
                    value={bbsSid}
                    onChange={(e) => setBbsSid(e.target.value)}
                    className="bg-gray-700 text-white px-4 py-2 rounded w-full"
                />
            </div>

            <button
                onClick={handleSave}
                className="bg-gray-700 text-white px-4 py-2 rounded-full"
            >
                保存
            </button>
            {message && <div className="mt-4 text-green-500">{message}</div>}
        </div>
    );
}

export default ProfileView;
