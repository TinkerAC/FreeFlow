import { useEffect, useState, useRef } from 'react';
import { configContext } from '@renderer/core/electronContextApi';
import chalk from 'chalk';

function useDebounced<T>(val:T, delay=200) {
  const [v, setV] = useState(val);
  useEffect(()=>{
    const t = setTimeout(()=>setV(val), delay);
    return ()=>clearTimeout(t);
  }, [val, delay]);
  return v;
}

/**
 * 统一读/写配置：
 * - 初次挂载：从主进程读取 config[key]；
 * - value 更新：去抖后写回主进程；
 */
export function useSetting<T=any>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const debounced = useDebounced(value, 150);
  const first = useRef(true);

  // 初次读取
  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try {
        const v = await configContext.getConfig(key);
        if (mounted && v !== undefined) setValue(v as T);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return ()=>{ mounted = false; };
  }, [key]);

  // 去抖写入
  useEffect(()=>{
    if (first.current) { first.current = false; return; }
    configContext.setConfig(key, debounced as any).catch(console.error);
    // console.log(chalk.blue(`[useSetting] set ${key} to`, debounced));
  }, [key, debounced]);

  return { value, setValue, loading } as const;
}