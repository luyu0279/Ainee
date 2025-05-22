import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Dispatch, SetStateAction } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidUrl(url: string): boolean {
  try {
    // Check if the URL is valid
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 获取 React 状态的最新值
 * @param dispatch - React 的 setState dispatch 函数
 * @returns Promise，解析为最新的状态值
 * @example
 * const [count, setCount] = useState(0);
 * const latestCount = await getLatestState(setCount);
 */
export const getLatestState = function <T>(dispatch: Dispatch<SetStateAction<T>>): Promise<T> {
    return new Promise<T>((resolve) => {
        dispatch((prevState) => {
            resolve(prevState);
            return prevState;
        });
    });
};
