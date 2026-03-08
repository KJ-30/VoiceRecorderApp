// iOS Design System - 主题配置
export const theme = {
  // 颜色
  colors: {
    // 主色调
    primary: '#007AFF',
    primaryLight: '#5AC8FA',
    primaryDark: '#0051D5',
    
    // 系统颜色
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    purple: '#AF52DE',
    pink: '#FF2D55',
    teal: '#5AC8FA',
    yellow: '#FFCC00',
    indigo: '#5856D6',
    
    // 灰度
    gray1: '#8E8E93',
    gray2: '#AEAEB2',
    gray3: '#C7C7CC',
    gray4: '#D1D1D6',
    gray5: '#E5E5EA',
    gray6: '#F2F2F7',
    
    // 背景色（深色模式）
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundTertiary: '#2C2C2E',
    
    // 文字颜色
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textTertiary: 'rgba(255, 255, 255, 0.3)',
    textQuaternary: 'rgba(255, 255, 255, 0.18)',
    
    // 分隔线
    separator: 'rgba(84, 84, 88, 0.65)',
    separatorOpaque: '#38383A',
  },
  
  // 间距
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // 圆角
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },
  
  // 字体
  typography: {
    // 字体大小
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      xxl: 22,
      xxxl: 28,
      xxxxl: 34,
    },
    // 字重
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    // 行高
    lineHeights: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },
  
  // 阴影
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 8,
    },
  },
  
  // iPhone尺寸
  iphone: {
    width: 393,
    height: 852,
    statusBarHeight: 54,
    navBarHeight: 44,
    tabBarHeight: 83,
    safeAreaTop: 59,
    safeAreaBottom: 34,
    dynamicIslandHeight: 37,
  },
};

// 动画配置
export const animations = {
  // 过渡时间
  durations: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  // 缓动函数
  easings: {
    default: 'easeInOut',
    easeIn: 'easeIn',
    easeOut: 'easeOut',
    spring: 'spring',
  },
};

// 工具函数
export const utils = {
  // 格式化时长
  formatDuration: (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  },

  // 格式化文件大小
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // 格式化日期
  formatDate: (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // 今天
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return '今天';
    }
    
    // 昨天
    if (diff < 48 * 60 * 60 * 1000 && date.getDate() === now.getDate() - 1) {
      return '昨天';
    }
    
    // 一周内
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[date.getDay()];
    }
    
    // 其他
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  // 格式化时间
  formatTime: (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  },

  // 获取问候语
  getGreeting: (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  },
};

export default theme;
