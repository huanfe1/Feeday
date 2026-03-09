import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.locale('zh-cn');
dayjs.extend(relativeTime);
dayjs.extend(duration);

export function formatTime(seconds: number) {
    return dayjs.duration(seconds, 'seconds').format('HH:mm:ss');
}

export { dayjs as dayjsPlugin };
