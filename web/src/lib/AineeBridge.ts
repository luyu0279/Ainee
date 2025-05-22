export default class AineeBridge {
    static isInAineeApp(): boolean {
        if (typeof window !== 'undefined') {
            const userAgent = window.navigator.userAgent;
            return userAgent.includes('AineeApp');
        }
        return false;
    }
} 