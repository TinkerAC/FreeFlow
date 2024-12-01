
import React, { useEffect, useState } from 'react';
import context from '@main/app/electronContextApi';

function getConfig(key: string): any {
  return context.getConfig(key);
}

function setConfig(key: string, value: any): any {
  return context.setConfig(key, value);
}

function ProfileView() {
  // 状态变量
  const [avatarPath, setAvatarPath] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [bbsToken, setBbsToken] = useState<string>('');
  const [bbsSid, setBbsSid] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [scanPaths, setScanPaths] = useState<string[]>([]);
  const [newScanPath, setNewScanPath] = useState<string>('');

  // 获取配置
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

      const paths = await getConfig('scan_paths');
      setScanPaths(paths || []);
    }

    fetchConfig();
  }, []);

  // 保存按钮的处理函数
  const handleSave = async () => {
    await setConfig('avatar_path', avatarPath);
    await setConfig('user_name', username);
    await setConfig('hifini_cookie.bbs_token', bbsToken);
    await setConfig('hifini_cookie.bbs_sid', bbsSid);
    await setConfig('scan_paths', scanPaths);
    setMessage('已保存');
  };

  // 处理头像文件选择
  const handleAvatarChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarPath(file.path);
    }
  };

  // 添加新的扫描路径
  const handleAddScanPath = () => {
    if (newScanPath.trim() !== '') {
      setScanPaths([...scanPaths, newScanPath.trim()]);
      setNewScanPath('');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">个人资料</h1>

      {/* 头像上传 */}
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

      {/* 用户名 */}
      <div className="mb-8">
        <label className="block text-gray-400 mb-2">用户名:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded w-full"
        />
      </div>

      {/* bbs_token */}
      <div className="mb-8">
        <label className="block text-gray-400 mb-2">bbs_token:</label>
        <input
          type="text"
          value={bbsToken}
          onChange={(e) => setBbsToken(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded w-full"
        />
      </div>

      {/* bbs_sid */}
      <div className="mb-8">
        <label className="block text-gray-400 mb-2">bbs_sid:</label>
        <input
          type="text"
          value={bbsSid}
          onChange={(e) => setBbsSid(e.target.value)}
          className="bg-gray-700 text-white px-4 py-2 rounded w-full"
        />
      </div>

      {/* 本地音乐扫描路径 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">本地音乐扫描路径:</h2>
        <ScanPathList items={scanPaths} onItemsChange={setScanPaths} />

        <div className="mt-4 flex">
          <input
            type="text"
            value={newScanPath}
            onChange={(e) => setNewScanPath(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded w-full"
            placeholder="添加新的扫描路径"
          />
          <button
            onClick={handleAddScanPath}
            className="ml-2 bg-green-500 text-white px-4 py-2 rounded"
          >
            添加
          </button>
        </div>
      </div>

      {/* 保存按钮 */}
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


interface ScanPathListProps {
  items: string[];
  onItemsChange: (items: string[]) => void;
}

function ScanPathList({ items, onItemsChange }: ScanPathListProps) {
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (index: number) => {
    setEditIndex(index);
    setEditValue(items[index]);
  };

  const handleDelete = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const handleSave = () => {
    const newItems = items.map((item, index) =>
      index === editIndex ? editValue : item,
    );
    onItemsChange(newItems);
    setEditIndex(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditIndex(null);
    setEditValue('');
  };

  return (
    <ul>
      {items.map((item, index) => (
        <li key={index} className="flex items-center mb-2">
          {editIndex === index ? (
            <>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-gray-700 text-white px-2 py-1 rounded w-full"
              />
              <button
                onClick={handleSave}
                className="ml-2 bg-green-500 text-white px-2 py-1 rounded"
              >
                保存
              </button>
              <button
                onClick={handleCancel}
                className="ml-2 bg-gray-500 text-white px-2 py-1 rounded"
              >
                取消
              </button>
            </>
          ) : (
            <>
              <span className="flex-grow">{item}</span>
              <button
                onClick={() => handleEdit(index)}
                className="ml-2 bg-blue-500 text-white px-2 py-1 rounded"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(index)}
                className="ml-2 bg-red-500 text-white px-2 py-1 rounded"
              >
                删除
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}


