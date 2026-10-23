/**
 * Kiyo Tak - Hero Canvas Animation
 * Theme: Rotating 3D squares with scattered dot contour, lavender & deep navy/black palette
 */

class KiyoHeroAnimation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.width = this.canvas.width = this.canvas.offsetWidth;
    this.height = this.canvas.height = this.canvas.offsetHeight;
    
    this.mouse = {
      x: this.width / 2,
      y: this.height / 2,
      targetX: this.width / 2,
      targetY: this.height / 2,
      isHovered: false
    };

    this.angleX = 0;
    this.angleY = 0;
    this.angleZ = 0;
    
    // Scattered Contour Particles & Squares Configuration
    this.numParticles = 120;
    this.particles = [];
    this.squareLayers = [
      { size: 140, rotSpeed: 0.008, color: '#C4B5FD', dots: 16, depth: 40 },
      { size: 210, rotSpeed: -0.005, color: '#8B5CF6', dots: 24, depth: 70 },
      { size: 280, rotSpeed: 0.003, color: '#38BDF8', dots: 32, depth: 100 },
      { size: 360, rotSpeed: -0.002, color: '#EAB308', dots: 40, depth: 140 }
    ];

    this.initParticles();
    this.bindEvents();
    this.animate();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * this.width * 1.2,
        y: (Math.random() - 0.5) * this.height * 1.2,
        z: (Math.random() - 0.5) * 500,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.2 + 0.8,
        color: Math.random() > 0.4 ? '#C4B5FD' : (Math.random() > 0.5 ? '#38BDF8' : '#FDE047'),
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      if (!this.canvas) return;
      this.width = this.canvas.width = this.canvas.offsetWidth;
      this.height = this.canvas.height = this.canvas.offsetHeight;
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.targetX = e.clientX - rect.left;
      this.mouse.targetY = e.clientY - rect.top;
      this.mouse.isHovered = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.targetX = this.width / 2;
      this.mouse.targetY = this.height / 2;
    });
  }

  project3D(x, y, z, fov = 400) {
    const scale = fov / (fov + z + 500);
    return {
      x: x * scale + this.width / 2,
      y: y * scale + this.height / 2,
      scale: scale
    };
  }

  rotatePoint(x, y, z, ax, ay, az) {
    // Rotate X
    let y1 = y * Math.cos(ax) - z * Math.sin(ax);
    let z1 = y * Math.sin(ax) + z * Math.cos(ax);
    let x1 = x;

    // Rotate Y
    let x2 = x1 * Math.cos(ay) + z1 * Math.sin(ay);
    let z2 = -x1 * Math.sin(ay) + z1 * Math.cos(ay);
    let y2 = y1;

    // Rotate Z
    let x3 = x2 * Math.cos(az) - y2 * Math.sin(az);
    let y3 = x2 * Math.sin(az) + y2 * Math.cos(az);
    let z3 = z2;

    return { x: x3, y: y3, z: z3 };
  }

  drawSquareContour(size, color, dotsCount, rotOffset) {
    const half = size / 2;
    // 4 corners of square
    const corners = [
      { x: -half, y: -half, z: 0 },
      { x: half, y: -half, z: 0 },
      { x: half, y: half, z: 0 },
      { x: -half, y: half, z: 0 }
    ];

    // Generate dotted contour points along perimeter
    const contourPoints = [];
    const dotsPerSide = Math.floor(dotsCount / 4);

    for (let side = 0; side < 4; side++) {
      const p1 = corners[side];
      const p2 = corners[(side + 1) % 4];

      for (let i = 0; i < dotsPerSide; i++) {
        const t = i / dotsPerSide;
        // Add subtle organic jitter
        const jitter = Math.sin(Date.now() * 0.003 + side + i) * 3;
        contourPoints.push({
          x: p1.x + (p2.x - p1.x) * t + jitter,
          y: p1.y + (p2.y - p1.y) * t + jitter,
          z: Math.cos(Date.now() * 0.002 + i) * 10
        });
      }
    }

    // Transform and Draw Contour Dots
    const projectedPoints = [];
    contourPoints.forEach((pt, index) => {
      const rot = this.rotatePoint(
        pt.x,
        pt.y,
        pt.z,
        this.angleX + rotOffset,
        this.angleY + rotOffset * 1.5,
        this.angleZ + rotOffset * 0.5
      );
      const proj = this.project3D(rot.x, rot.y, rot.z);
      projectedPoints.push(proj);

      // Draw dot
      this.ctx.beginPath();
      this.ctx.arc(proj.x, proj.y, Math.max(1, 2.5 * proj.scale), 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = Math.min(1, Math.max(0.2, proj.scale * 1.2));
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = color;
      this.ctx.fill();
    });

    // Draw connecting contour lines
    this.ctx.beginPath();
    projectedPoints.forEach((pt, i) => {
      if (i === 0) this.ctx.moveTo(pt.x, pt.y);
      else this.ctx.lineTo(pt.x, pt.y);
    });
    this.ctx.closePath();
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = 0.25;
    this.ctx.lineWidth = 1.2;
    this.ctx.stroke();

    // Cross diagonals for tech/geometric look
    if (projectedPoints.length >= 4) {
      this.ctx.beginPath();
      this.ctx.moveTo(projectedPoints[0].x, projectedPoints[0].y);
      this.ctx.lineTo(projectedPoints[Math.floor(projectedPoints.length / 2)].x, projectedPoints[Math.floor(projectedPoints.length / 2)].y);
      this.ctx.strokeStyle = 'rgba(196, 181, 253, 0.15)';
      this.ctx.stroke();
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Adjust angles based on mouse
    const targetAngleY = ((this.mouse.x - this.width / 2) / (this.width / 2)) * 0.8;
    const targetAngleX = -((this.mouse.y - this.height / 2) / (this.height / 2)) * 0.8;

    this.angleX += 0.004 + (targetAngleX - this.angleX) * 0.04;
    this.angleY += 0.006 + (targetAngleY - this.angleY) * 0.04;
    this.angleZ += 0.002;

    // Draw Scattered Ambient Particles
    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      if (Math.abs(p.x) > this.width) p.x *= -0.9;
      if (Math.abs(p.y) > this.height) p.y *= -0.9;
      if (Math.abs(p.z) > 300) p.z *= -0.9;

      const rot = this.rotatePoint(p.x, p.y, p.z, this.angleX * 0.3, this.angleY * 0.3, 0);
      const proj = this.project3D(rot.x, rot.y, rot.z);

      this.ctx.beginPath();
      this.ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha * proj.scale;
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.color;
      this.ctx.fill();
    });

    // Draw Multi-layered Rotating Squares
    this.squareLayers.forEach((layer, idx) => {
      const offset = (idx + 1) * 0.4;
      this.drawSquareContour(layer.size, layer.color, layer.dots, offset);
    });

    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1.0;

    requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.kiyoHeroAnim = new KiyoHeroAnimation('heroCanvas');
});
