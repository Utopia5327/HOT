let branches = [];
const initialCount = 12;
const stepSize     = 1.5;
const branchProb   = 0.025;
const maxLifeMin   = 100;
const maxLifeMax   = 140;
const maxBranches  = 400;
const fadeAlpha    = 5;

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.id('mycelium-canvas');
  
  // Set initial background based on current theme
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const bgColor = isDark ? color(26, 26, 26) : color(252, 250, 245);
  background(bgColor);
  
  frameRate(30);
  spawnCluster();
}

function draw() {
  noStroke();
  
  // Use theme-appropriate background color for fade
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const fadeColor = isDark ? color(26, 26, 26, fadeAlpha) : color(252, 250, 245, fadeAlpha);
  fill(fadeColor);
  rect(0, 0, width, height);

  for (let i = branches.length - 1; i >= 0; i--) {
    let b = branches[i];
    b.grow();
    if (b.finished) branches.splice(i, 1);
  }

  if (branches.length === 0) {
    spawnCluster();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function spawnCluster() {
  let center = createVector(random(width), random(height));
  for (let i = 0; i < initialCount; i++) {
    let angle = map(i, 0, initialCount, 0, TWO_PI);
    let dir = p5.Vector.fromAngle(angle).setMag(stepSize);
    branches.push(new Branch(center, dir, 0));
  }
}

class Branch {
  constructor(pos, dir, depth) {
    this.pos      = pos.copy();
    this.dir      = dir.copy();
    this.depth    = depth;
    this.life     = 0;
    this.maxLife  = random(maxLifeMin, maxLifeMax);
    this.finished = false;
    this.weight   = map(depth, 0, 7, 3, 0.3);
  }

  grow() {
    if (this.finished) return;

    let next = p5.Vector.add(this.pos, this.dir);
    strokeWeight(this.weight);
    
    // Use theme-appropriate stroke color
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const strokeColor = isDark ? color(200, map(this.depth, 0, 7, 0, 200)) : color(20, map(this.depth, 0, 7, 0, 200));
    stroke(strokeColor);
    
    line(this.pos.x, this.pos.y, next.x, next.y);

    this.pos = next;
    this.life++;

    if (branches.length < maxBranches && this.depth < 7 && random() < branchProb) {
      let a = random(-PI/3, PI/3);
      let nd = this.dir.copy().rotate(a).setMag(stepSize);
      branches.push(new Branch(this.pos, nd, this.depth + 1));
    }

    this.dir.rotate(random(-0.1, 0.1));

    if (
      this.life > this.maxLife ||
      this.pos.x < 0 || this.pos.x > width ||
      this.pos.y < 0 || this.pos.y > height
    ) {
      this.finished = true;
    }
  }
}

// Listen for theme changes and update the canvas
window.addEventListener('themeChange', function(e) {
  const isDark = e.detail.theme === 'dark';
  const bgColor = isDark ? color(26, 26, 26) : color(252, 250, 245);
  background(bgColor);
}); 