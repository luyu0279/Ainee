import { PROGRESS_SIMULATION_CONFIG } from '@/types/upload';

export class UploadProgressSimulator {
  private progress: number = 0;
  private stopPosition: number;
  private startTime: number;
  private animationFrameId: number | null = null;
  private onProgressUpdate: (progress: number) => void;
  private isSimulating: boolean = false;

  constructor(onProgressUpdate: (progress: number) => void) {
    this.onProgressUpdate = onProgressUpdate;
    this.stopPosition = this.generateStopPosition();
    this.startTime = Date.now();
  }

  private generateStopPosition(): number {
    return Math.floor(
      Math.random() * 
      (PROGRESS_SIMULATION_CONFIG.MAX_STOP_POSITION - PROGRESS_SIMULATION_CONFIG.MIN_STOP_POSITION + 1) + 
      PROGRESS_SIMULATION_CONFIG.MIN_STOP_POSITION
    );
  }

  private animate = () => {
    if (!this.isSimulating) return;

    const currentTime = Date.now();
    const elapsed = currentTime - this.startTime;
    
    if (elapsed < PROGRESS_SIMULATION_CONFIG.LINEAR_DURATION) {
      // 线性增长阶段
      this.progress = Math.min(
        (elapsed / PROGRESS_SIMULATION_CONFIG.LINEAR_DURATION) * this.stopPosition,
        this.stopPosition
      );
    }

    this.onProgressUpdate(this.progress);
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  start() {
    this.isSimulating = true;
    this.startTime = Date.now();
    this.animate();
  }

  stop() {
    this.isSimulating = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  complete() {
    const startProgress = this.progress;
    const startTime = Date.now();

    const completeAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(
        startProgress + 
        ((100 - startProgress) * elapsed) / PROGRESS_SIMULATION_CONFIG.SUCCESS_COMPLETION_DURATION,
        100
      );

      this.progress = progress;
      this.onProgressUpdate(progress);

      if (progress < 100) {
        requestAnimationFrame(completeAnimation);
      }
    };

    completeAnimation();
  }

  reset() {
    this.stop();
    this.progress = 0;
    this.stopPosition = this.generateStopPosition();
    this.onProgressUpdate(0);
  }

  getCurrentProgress(): number {
    return this.progress;
  }
} 