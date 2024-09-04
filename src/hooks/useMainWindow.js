import {useEffect, useState} from 'react';

function useMainWindow() {
    const [isMusicLibraryCollapsed, setIsMusicLibraryCollapsed] = useState(false);
    const [isRightContentVisible, setIsRightContentVisible] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1000) {
                // 如果窗口宽度小于1000px，自动折叠左侧栏并隐藏右侧栏
                setIsMusicLibraryCollapsed(true);
                setIsRightContentVisible(false);
            } else if (window.innerWidth < 1400) {
                // 如果窗口宽度在1000px到1400px之间，折叠左侧栏但显示右侧栏
                setIsMusicLibraryCollapsed(true);
                setIsRightContentVisible(true);
            } else {
                // 如果窗口宽度大于1400px，展开左侧栏并显示右侧栏
                setIsMusicLibraryCollapsed(false);
                setIsRightContentVisible(true);
            }
        };

        // 初始调用以设置初始状态
        handleResize();

        // 监听窗口大小变化事件
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // 方法用于手动控制右侧栏的显示状态
    const toggleRightContent = () => {
        setIsRightContentVisible((prev) => !prev);
    };

    return {
        isMusicLibraryCollapsed,
        setIsMusicLibraryCollapsed,
        isRightContentVisible,
        toggleRightContent,
    };
}

export default useMainWindow;
