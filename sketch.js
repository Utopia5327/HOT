let cols, rows;
let spacing = 28; // Very high density so connected point segments perfectly form smooth fluid curves
let field = [];
let zoff = 0; 

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.id('mycelium-canvas');
  initGrid();
  frameRate(60);
}

function initGrid() {
  cols = floor(width / spacing) + 4;
  rows = floor(height / spacing) + 4;
  field = [];
  
  for (let i = 0; i < cols; i++) {
    field[i] = [];
    for (let j = 0; j < rows; j++) {
      field[i][j] = new Point((i - 2) * spacing, (j - 2) * spacing);
    }
  }
}

function draw() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  background(isDark ? color(14, 14, 14) : color(252, 250, 245));
  noFill();

  zoff += 0.002; 

  // Mathematically update grid positioning
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      field[i][j].update(zoff);
    }
  }

  // Draw highly fluid, connected Topographical Splines
  // Rendered segment by segment so opacity and thickness can glow massively near the cursor
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols - 1; i++) {
        let pt1 = field[i][j];
        let pt2 = field[i+1][j];
        
        let dxMouse = pt1.x - mouseX;
        let dyMouse = pt1.y - mouseY;
        let d = sqrt(dxMouse*dxMouse + dyMouse*dyMouse);
        
        let intensity = 0;
        if (d < 700) {
            intensity = pow(1 - (d / 700), 2.2);
        }
        
        // Massive glowing fade and thickness (The 'energy locus' effect)
        if (isDark) {
           stroke(240, 245, 235, map(intensity, 0, 1, 15, 240));
           strokeWeight(map(intensity, 0, 1, 0.4, 2.0));
        } else {
           stroke(30, 30, 30, map(intensity, 0, 1, 15, 200));
           strokeWeight(map(intensity, 0, 1, 0.4, 2.0));
        }
        
        // Smoothly draw the curve segment using p5.js native curve function
        // We use the neighbors to define the tangents so it perfectly arches instead of drawing sharp straight lines
        let pt0 = (i > 0) ? field[i-1][j] : pt1;
        let pt3 = (i < cols - 2) ? field[i+2][j] : pt2;
        curve(pt0.x, pt0.y, pt1.x, pt1.y, pt2.x, pt2.y, pt3.x, pt3.y);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initGrid(); 
}

class Point {
  constructor(x, y) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }
  
  update(zScale) {
    let dx = mouseX - this.baseX;
    let dy = mouseY - this.baseY;
    let d = sqrt(dx*dx + dy*dy); 
    
    let targetX = this.baseX;
    let targetY = this.baseY;
    
    // ZHA 'Blob' Lens (Massive repulsion void that curves geometry around it)
    let radius = 850; // Vast area to ensure a large visible blob spacing
    if (d < radius && d > 0) {
      // Fatter falloff curve to make the blob feel substantial and smooth
      let intensity = pow(1 - (d / radius), 1.5);
      
      // Push strongly outward radially—since it repels, it naturally avoids tangling!
      let force = intensity * 180; 
      let vortexForce = intensity * 45;
      
      let angle = atan2(dy, dx);
      // REPEL (Creates the 'space' / the blob void)
      targetX -= cos(angle) * force; 
      targetY -= sin(angle) * force;
      
      // Subtle majestic twist
      targetX += cos(angle + HALF_PI) * vortexForce;
      targetY += sin(angle + HALF_PI) * vortexForce;
    }
    
    // Ambient breathing contour
    let n = noise(this.baseX * 0.003, this.baseY * 0.003, zScale);
    let driftAngle = n * TWO_PI * 2; 
    
    // Slow sweeping ocean drift (constrained to avoid tangling)
    targetX += cos(driftAngle) * 20; 
    targetY += sin(driftAngle) * 20;

    // Tighter Spring structure ensures the mesh always returns to its graceful flow
    let spring = 0.08; 
    let friction = 0.82;  
    
    this.vx += (targetX - this.x) * spring;
    this.vy += (targetY - this.y) * spring;
    
    this.vx *= friction;
    this.vy *= friction;
    
    this.x += this.vx;
    this.y += this.vy;
  }
}

// Fast theme swap execution
window.addEventListener('themeChange', function(e) {
  const isDark = e.detail.theme === 'dark';
  background(isDark ? color(14, 14, 14) : color(252, 250, 245));
});
