import React, { useCallback, useEffect, useState } from 'react';
import { configContext, systemContext } from '@renderer/core/electronContextApi';
import { formatStorageUnit } from '@src/utils/fsUtils';


// 一个简单的SVG Icon示例 (实际项目中建议使用图标库)
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

function ProfileView() {
  const [avatarPath, setAvatarPath] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [bbsToken, setBbsToken] = useState<string>('');
  const [bbsSid, setBbsSid] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [scanPaths, setScanPaths] = useState<string[]>([]);
  const [newScanPath, setNewScanPath] = useState<string>('');
  const [diskByteUsage, setDiskByteUsage] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [author, setAuthor] = useState<string>('');

  const fetchConfig = useCallback(async () => {
    const avatar = await configContext.getConfig<string>('avatar_path');
    setAvatarPath(avatar || '');
    const name = await configContext.getConfig<string>('user_name');
    setUsername(name || '');
    const token = await configContext.getConfig<string>('hifini_cookie.bbs_token');
    setBbsToken(token || '');
    const sid = await configContext.getConfig<string>('hifini_cookie.bbs_sid');
    setBbsSid(sid || '');
    const paths = await configContext.getConfig<string[]>('scan_paths');
    setScanPaths(paths || []);
    const byteUsage = await systemContext.calculateFileCacheDiskUsage();
    setDiskByteUsage(byteUsage || 0);
    const appVersion = await systemContext.getAppVersion();
    setAppVersion(appVersion);
    const author = 'Tinker';
    setAuthor(author);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      await configContext.setConfig('avatar_path', avatarPath);
      await configContext.setConfig('user_name', username);
      await configContext.setConfig('hifini_cookie.bbs_token', bbsToken);
      await configContext.setConfig<string>('hifini_cookie.bbs_sid', bbsSid);
      await configContext.setConfig<string[]>('scan_paths', scanPaths);
      setMessage('设置已成功保存！');
      setTimeout(() => setMessage(''), 3000); // 3秒后清除消息
    } catch (error) {
      console.error('保存配置失败:', error);
      setMessage('保存失败，请重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 在Electron中，file.path 是标准的文件系统路径
      setAvatarPath(file.path);
    }
  };

  const handleSelectAvatar = () => {
    // 触发隐藏的 input file 点击事件
    document.getElementById('avatarUploadInput')?.click();
  };

  const handleAddScanPath = async () => {
    if (newScanPath.trim() !== '') {
      // 检查路径是否已存在
      if (scanPaths.includes(newScanPath.trim())) {
        setMessage('该扫描路径已存在。');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      // 检查路径是否有效 (可选，如果 systemContext 提供此功能)
      // const isValid = await systemContext.isValidDirectory(newScanPath.trim());
      // if (!isValid) {
      //   setMessage('无效的目录路径。');
      //   return;
      // }
      setScanPaths([...scanPaths, newScanPath.trim()]);
      setNewScanPath('');
      setMessage('扫描路径已添加，请记得保存。');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleOpenDirectoryDialog = async () => {
    // const selectedPath = await systemContext.openDirectoryDialog();
    // if (selectedPath) {
    //   setNewScanPath(selectedPath);
    // }
    alert('UnImplemented.');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8 selection:bg-blue-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-10">
        <header>
          <h1
            className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
            个人中心
          </h1>
          <p className="text-gray-400">管理您的应用设置和偏好。</p>
        </header>

        {/* 头像与用户名卡片 */}
        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 text-gray-200">用户设置</h2>
          <div className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-8">
            <div className="relative group">
              <img
                src={avatarPath ? `file://${avatarPath}` : 'https://via.placeholder.com/96/374151/FFFFFF?text=Avatar'} // 默认头像
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-700 group-hover:opacity-75 transition-opacity cursor-pointer"
                onClick={handleSelectAvatar}
              />
              <div
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleSelectAvatar}
              >
                <span className="text-white text-sm">更改头像</span>
              </div>
              <input
                id="avatarUploadInput"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="flex-grow w-full">
              <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入您的昵称"
                className="w-full bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 px-4 py-2.5 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* HiFiNi Cookie 设置 */}
        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 text-gray-200">HiFiNi Cookie 设置</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="bbs_token" className="block text-sm font-medium text-gray-400 mb-1">
                bbs_token
              </label>
              <input
                id="bbs_token"
                type="text"
                value={bbsToken}
                onChange={(e) => setBbsToken(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-gray-100 px-4 py-2.5 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="bbs_sid" className="block text-sm font-medium text-gray-400 mb-1">
                bbs_sid
              </label>
              <input
                id="bbs_sid"
                type="text"
                value={bbsSid}
                onChange={(e) => setBbsSid(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-gray-100 px-4 py-2.5 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* 本地音乐扫描路径 */}
        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 text-gray-200">本地音乐扫描路径</h2>
          <ScanPathList items={scanPaths} onItemsChange={setScanPaths} />
          <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
            <input
              type="text"
              value={newScanPath}
              onChange={(e) => setNewScanPath(e.target.value)}
              className="flex-grow bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 px-4 py-2.5 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="输入或选择新的扫描路径"
            />
            <button
              onClick={handleOpenDirectoryDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg shadow-md transition-colors flex items-center justify-center sm:w-auto"
              title="选择文件夹"
            >
              <FolderIcon />
              <span className="sm:hidden ml-2">选择文件夹</span>
            </button>
            <button
              onClick={handleAddScanPath}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-md transition-colors sm:w-auto"
            >
              添加路径
            </button>
          </div>
        </section>

        {/* 操作与信息 */}
        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 text-gray-200">应用管理</h2>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-gray-300">
                已用缓存空间: <span className="font-semibold text-blue-400">{formatStorageUnit(diskByteUsage)}</span>
              </p>
              <button
                onClick={() => systemContext.revealDataBaseInFileSystem()}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg shadow-md transition-colors"
              >
                显示数据库文件
              </button>
            </div>
          </div>
        </section>

        {/* 保存按钮 */}
        <div className="mt-10 flex flex-col items-center">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-10 py-3 rounded-lg shadow-xl transform transition-all duration-150 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存所有更改'}
          </button>
          {message && (
            <div
              className={`mt-4 px-4 py-2 rounded-md text-sm font-medium ${message.includes('失败') ? 'bg-red-700 text-red-100' : 'bg-green-700 text-green-100'}`}>
              {message}
            </div>
          )}
        </div>

        {/* 应用信息 */}
        <footer className="mt-12 pt-8 border-t border-gray-700 text-center text-gray-500">
          <p>版本号: {appVersion}</p>
          <p>作者: {author}</p>
          <p className="mt-2 text-xs">
            &copy; {new Date().getFullYear()} 本软件是<b>自由软件</b>
            &nbsp;，欢迎自由使用、复制、分发和修改。
          </p>
        </footer>
      </div>
    </div>
  );
}


interface ScanPathListProps {
  items: string[];
  onItemsChange: (items: string[]) => void;
}

function ScanPathList({ items, onItemsChange }: ScanPathListProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (index: number) => {
    setEditIndex(index);
    setEditValue(items[index]);
  };

  const handleDelete = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  const handleSaveEdit = (indexToSave: number) => { // Renamed to avoid conflict with ProfileView's handleSave
    if (editValue.trim() === '') {
      // Optionally show an error message if path cannot be empty
      return;
    }
    const newItems = items.map((item, index) =>
      index === indexToSave ? editValue.trim() : item,
    );
    onItemsChange(newItems);
    setEditIndex(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditValue('');
  };

  if (items.length === 0) {
    return <p className="text-gray-500 italic">暂无扫描路径。请在下方添加。</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 bg-gray-700/50 rounded-lg shadow hover:shadow-md transition-shadow duration-150"
        >
          {editIndex === index ? (
            <>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-grow bg-gray-600 border border-gray-500 text-gray-100 px-3 py-2 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-2 sm:mb-0 sm:mr-2"
                autoFocus
              />
              <div className="flex space-x-2 flex-shrink-0 justify-end">
                <button
                  onClick={() => handleSaveEdit(index)}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors text-sm"
                >
                  保存
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors text-sm"
                >
                  取消
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="flex-grow text-gray-300 py-2 break-all">{item}</span>
              <div className="flex space-x-2 flex-shrink-0 mt-2 sm:mt-0 sm:ml-2">
                <button
                  onClick={() => handleEdit(index)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors"
                  title="编辑"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-colors"
                  title="删除"
                >
                  <DeleteIcon />
                </button>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export default ProfileView;