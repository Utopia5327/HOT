const nodes = [];
const nodeCount = 130;  // Adjust density
const connectDistance = 180;
const mouseRepelRadius = 200;
const mouseRepelForce = 0.05;

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.id('mycelium-canvas');
  
  // Smooth fade-in for project pages
  cnv.elt.style.opacity = '0';
  cnv.elt.style.transition = 'opacity 1.5s ease';
  setTimeout(() => { cnv.elt.style.opacity = '1'; }, 300);

  // Spawn initial nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push(new Node(random(width), random(height)));
  }

  frameRate(60);
}

function draw() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  // Fast, clean background wipe (no trails) for CAD-like precision
  background(isDark ? color(14, 14, 14) : color(252, 250, 245));

  const maxAlpha = isDark ? 160 : 120;
  const strokeColor = isDark ? color(230, 235, 220) : color(40, 40, 40);

  // Update and display nodes
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].update();
    nodes[i].interact(mouseX, mouseY);
    
    // Draw connections
    for (let j = i + 1; j < nodes.length; j++) {
      let d = dist(nodes[i].pos.x, nodes[i].pos.y, nodes[j].pos.x, nodes[j].pos.y);
      if (d < connectDistance) {
        let alpha = map(d, 0, connectDistance, maxAlpha, 0);
        strokeWeight(isDark ? 0.8 : 0.6);
        let c = color(red(strokeColor), green(strokeColor), blue(strokeColor), alpha);
        stroke(c);
        line(nodes[i].pos.x, nodes[i].pos.y, nodes[j].pos.x, nodes[j].pos.y);
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Rebalance nodes if screen grows substantially
  if (width * height > nodes.length * 15000) {
     nodes.push(new Node(random(width), random(height)));
  }
}

class Node {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(0.1, 0.4));
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
    this.baseSpeed = random(0.3, 0.7);
  }

  update() {
    // Add Perlin noise for organic but precise drifting
    let angle = noise(this.noiseOffsetX, this.noiseOffsetY) * TWO_PI * 2;
    let nVel = p5.Vector.fromAngle(angle).mult(0.2);
    this.vel.add(nVel).limit(this.baseSpeed);
    
    this.pos.add(this.vel);

    this.noiseOffsetX += 0.002;
    this.noiseOffsetY += 0.002;

    // Wrap-around edges
    if (this.pos.x < -50) this.pos.x = width + 50;
    if (this.pos.x > width + 50) this.pos.x = -50;
    if (this.pos.y < -50) this.pos.y = height + 50;
    if (this.pos.y > height + 50) this.pos.y = -50;
  }

  interact(mx, my) {
    let mousePos = createVector(mx, my);
    let d = dist(this.pos.x, this.pos.y, mousePos.x, mousePos.y);
    // Repel from mouse
    if (d < mouseRepelRadius) {
      let force = p5.Vector.sub(this.pos, mousePos);
      force.normalize();
      let strength = map(d, 0, mouseRepelRadius, mouseRepelForce, 0);
      force.mult(strength);
      this.vel.add(force);
    }
  }
}

// Global listener for fast theme swapping
window.addEventListener('themeChange', function(e) {
  const isDark = e.detail.theme === 'dark';
  background(isDark ? color(14, 14, 14) : color(252, 250, 245));
});
