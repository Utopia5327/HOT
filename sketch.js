let branches = [];
const initialCount = 4;
const stepSize     = 1.5;
const branchProb   = 0.012;   // sparse — fewer forks
const maxLifeMin   = 60;
const maxLifeMax   = 100;
const maxBranches  = 80;      // hard cap keeps screen uncluttered
const fadeAlpha    = 10;      // faster trail fade

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.id('mycelium-canvas');

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  background(isDark ? color(26, 26, 26) : color(252, 250, 245));

  frameRate(30);
  spawnCluster();
}

function draw() {
  noStroke();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  fill(isDark ? color(26, 26, 26, fadeAlpha) : color(252, 250, 245, fadeAlpha));
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
  let center = createVector(random(width * 0.2, width * 0.8), random(height * 0.2, height * 0.8));
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
  }

  grow() {
    if (this.finished) return;

    let next = p5.Vector.add(this.pos, this.dir);

    // Taper weight with depth
    if (this.depth === 0) {
      strokeWeight(0.7);
    } else if (this.depth <= 2) {
      strokeWeight(0.45);
    } else {
      strokeWeight(0.25);
    }

    // Keep alpha low — these should read as texture, not lines
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    let alpha = map(this.depth, 0, 5, 110, 25);
    stroke(isDark ? color(210, 208, 204, alpha) : color(70, 70, 65, alpha));

    line(this.pos.x, this.pos.y, next.x, next.y);

    this.pos = next;
    this.life++;

    if (branches.length < maxBranches && this.depth < 5 && random() < branchProb) {
      let a = random(-PI / 4, PI / 4);
      let nd = this.dir.copy().rotate(a).setMag(stepSize);
      branches.push(new Branch(this.pos, nd, this.depth + 1));
    }

    this.dir.rotate(random(-0.08, 0.08));

    if (
      this.life > this.maxLife ||
      this.pos.x < 0 || this.pos.x > width ||
      this.pos.y < 0 || this.pos.y > height
    ) {
      this.finished = true;
    }
  }
}

window.addEventListener('themeChange', function(e) {
  const isDark = e.detail.theme === 'dark';
  background(isDark ? color(26, 26, 26) : color(252, 250, 245));
});
