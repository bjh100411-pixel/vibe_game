export class Boss {
  constructor(data, scale = 1) {
    Object.assign(this, {
      ...data,
      x: 640,
      y: 330,
      r: data.r,
      hp: data.hp * scale,
      maxHp: data.hp * scale,
      damage: data.damage * scale,
      speed: data.speed,
      dead: false,
      lastPattern: 1.8,
      patternIndex: 0,
      phase: 1,
      hitFlash: 0,
      windup: 0,
      charge: null,
      summonTimer: 0,
      warning: null,
      pendingAttack: 0,
      contactTime: -100,
      burnTime: 0,
      burnDps: 0,
      burnTick: 0,
      pendingSalvos: []
    });
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.player;
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (this.burnTime > 0) {
      this.burnTime -= dt;
      this.burnTick += dt;
      if (this.burnTick >= 0.35) {
        this.burnTick = 0;
        game.damageBoss(this.burnDps * 0.35, '#ff9b57');
        if (this.dead) return;
      }
    }

    this.lastPattern -= dt;
    this.windup = Math.max(0, this.windup - dt);
    this.summonTimer -= dt;
    // Delayed volleys are locked at telegraph time and fire on a fixed cadence.
    for (const salvo of this.pendingSalvos) salvo.time -= dt;
    for (const salvo of this.pendingSalvos.filter(item => item.time <= 0)) {
      for (const angle of salvo.angles) {
        game.enemyProjectiles.push(game.makeEnemyProjectile(this.x, this.y, Math.cos(angle), Math.sin(angle), salvo.damage, salvo.speed, salvo.radius, salvo.color));
      }
    }
    this.pendingSalvos = this.pendingSalvos.filter(item => item.time > 0);

    if (this.phase === 1 && this.hp / this.maxHp < this.phaseAt) {
      this.phase = 2;
      this.speed *= 1.28;
      this.damage *= 1.18;
      game.toast('보스가 광폭화했습니다!', '#f18b8b');
      game.shake = 14;
      game.effects.ring(this.x, this.y, 280, '#ed6777');
      game.audio.play('boss');
    }

    // A charge follows the exact endpoint locked in by its warning marker.
    // It never re-aims toward the player's changing position mid-attack.
    if (this.charge) {
      const dx = this.charge.x - this.x;
      const dy = this.charge.y - this.y;
      const distance = Math.hypot(dx, dy);
      const step = Math.min(distance, this.charge.speed * dt);
      if (distance <= step + 0.001) {
        this.x = this.charge.x;
        this.y = this.charge.y;
        this.charge = null;
      } else if (distance > 0) {
        this.x += (dx / distance) * step;
        this.y += (dy / distance) * step;
      }
    } else if (!this.warning) {
      // Hold position while telegraphing so the preview and attack origin stay aligned.
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      const desired = 190;
      if (d > desired + 30) {
        this.x += nx * this.speed * dt;
        this.y += ny * this.speed * dt;
      } else if (d < desired - 35) {
        this.x -= nx * this.speed * 0.55 * dt;
        this.y -= ny * this.speed * 0.55 * dt;
      }
    }

    this.x = Math.max(game.arena.left + this.r, Math.min(game.arena.right - this.r, this.x));
    this.y = Math.max(game.arena.top + this.r, Math.min(game.arena.bottom - this.r, this.y));

    if (this.lastPattern <= 0 && !this.warning && !this.charge) {
      this.lastPattern = this.id === 'furnaceBeast' ? (this.phase === 1 ? 2.9 : 2.1) : (this.phase === 1 ? 3.5 : 2.6);
      this.preparePattern(game, p);
    }

    if (this.warning) {
      // Charge telegraph tracks the player's latest position until the final warning frame.
      // executePattern then locks this last direction for the full charge.
      if (this.warning.type === 'charge') this.updateChargeWarning(game, p);
      this.warning.time -= dt;
      if (this.warning.time <= 0) {
        const pending = this.warning;
        this.warning = null;
        this.executePattern(game, p, pending);
      }
    }

    const playerDistance = Math.hypot(p.x - this.x, p.y - this.y);
    if (playerDistance < this.r + p.r + 12 && game.time - this.contactTime > 1.0) {
      game.hitPlayer(this, this.damage);
      this.contactTime = game.time;
    }
  }

  preparePattern(game, p) {
    const pat = this.patternIndex++ % this.patterns.length;
    const type = this.patterns[pat];
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const dirX = dx / d;
    const dirY = dy / d;
    const warning = {
      type,
      // Shorter, sharper tell: enough time to react without leaving the marker on screen too long.
      time: 0.72,
      x: p.x,
      y: p.y,
      angle: Math.atan2(dy, dx),
      zones: []
    };

    if (type === 'ember_ring') {
      warning.angle = Math.atan2(dy, dx);
      warning.r = 150;
      warning.projectileCount = this.phase === 2 ? 16 : 12;
    }

    if (type === 'void_cross') {
      warning.angle = Math.atan2(dy, dx);
      warning.range = 620;
      warning.crossDirections = [0, 1, 2, 3].map(i => warning.angle + i * Math.PI / 2);
      warning.crossProjectileAngles = warning.crossDirections.flatMap(base => [-0.055, 0, 0.055].map(offset => base + offset));
    }

    if (type === 'void_pulse') {
      warning.r = this.phase === 2 ? 220 : 175;
      warning.projectileCount = this.phase === 2 ? 16 : 12;
    }

    if (type === 'rain') {
      for (let i = 0; i < (this.phase === 2 ? 7 : 4); i++) {
        warning.zones.push({
          x: game.arena.left + 80 + Math.random() * (game.arena.right - game.arena.left - 160),
          y: game.arena.top + 55 + Math.random() * (game.arena.bottom - game.arena.top - 110),
          r: 54
        });
      }
    }

    if (type === 'slam') {
      warning.x = p.x;
      warning.y = p.y;
      warning.r = this.phase === 2 ? 100 : 78;
    }

    if (type === 'fire_pillars') {
      const spacing = this.phase === 2 ? 72 : 82;
      const count = this.phase === 2 ? 5 : 3;
      const px = -dirY, py = dirX;
      warning.zoneRadius = this.phase === 2 ? 41 : 44;
      warning.zones = Array.from({ length: count }, (_, i) => {
        const offset = (i - (count - 1) / 2) * spacing;
        return {
          x: Math.max(game.arena.left + warning.zoneRadius, Math.min(game.arena.right - warning.zoneRadius, p.x + px * offset)),
          y: Math.max(game.arena.top + warning.zoneRadius, Math.min(game.arena.bottom - warning.zoneRadius, p.y + py * offset)),
          r: warning.zoneRadius
        };
      });
    }

    if (type === 'ember_barrage') {
      warning.time = 0.84;
      const volleys = 3;
      const projectileCount = this.phase === 2 ? 7 : 5;
      const angleStep = this.phase === 2 ? 0.145 : 0.18;
      warning.barrageVolleys = Array.from({ length: volleys }, (_, volley) => {
        const center = warning.angle + (volley - 1) * (this.phase === 2 ? 0.15 : 0.12);
        return Array.from({ length: projectileCount }, (_, i) => center + (i - (projectileCount - 1) / 2) * angleStep);
      });
      warning.range = 500;
    }

    if (type === 'charge') {
      // Clamp the endpoint along the same vector (rather than clamping x/y separately),
      // so the red line and the boss's actual movement are geometrically identical.
      const desiredDistance = 520;
      let allowedDistance = desiredDistance;
      if (dirX > 0) allowedDistance = Math.min(allowedDistance, (game.arena.right - this.r - this.x) / dirX);
      else if (dirX < 0) allowedDistance = Math.min(allowedDistance, (game.arena.left + this.r - this.x) / dirX);
      if (dirY > 0) allowedDistance = Math.min(allowedDistance, (game.arena.bottom - this.r - this.y) / dirY);
      else if (dirY < 0) allowedDistance = Math.min(allowedDistance, (game.arena.top + this.r - this.y) / dirY);
      allowedDistance = Math.max(0, allowedDistance);
      warning.dirX = dirX;
      warning.dirY = dirY;
      warning.chargeDistance = allowedDistance;
      warning.x2 = this.x + dirX * allowedDistance;
      warning.y2 = this.y + dirY * allowedDistance;
    }

    if (type === 'fan') {
      warning.angle = Math.atan2(dy, dx);
      warning.range = 600; // Matches the hostile projectile's actual maximum travel distance.
      warning.projectileCount = this.phase === 2 ? 9 : 6;
      warning.angleStep = this.phase === 2 ? 0.18 : 0.2;
      warning.projectileAngles = Array.from(
        { length: warning.projectileCount },
        (_, i) => warning.angle + (i - (warning.projectileCount - 1) / 2) * warning.angleStep
      );
      warning.spread = ((warning.projectileCount - 1) / 2) * warning.angleStep;
    }

    this.warning = warning;
    game.audio.play('boss');
  }

  updateChargeWarning(game, p) {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const dirX = dx / d, dirY = dy / d;
    let allowed = 520;
    if (dirX > 0) allowed = Math.min(allowed, (game.arena.right - this.r - this.x) / dirX);
    else if (dirX < 0) allowed = Math.min(allowed, (game.arena.left + this.r - this.x) / dirX);
    if (dirY > 0) allowed = Math.min(allowed, (game.arena.bottom - this.r - this.y) / dirY);
    else if (dirY < 0) allowed = Math.min(allowed, (game.arena.top + this.r - this.y) / dirY);
    allowed = Math.max(0, allowed);
    Object.assign(this.warning, { dirX, dirY, chargeDistance: allowed, x2: this.x + dirX * allowed, y2: this.y + dirY * allowed });
  }

  executePattern(game, p, w) {
    const phase2 = this.phase === 2;
    if (w.type === 'charge') {
      // The destination is the same point shown by the red path preview.
      this.charge = {
        x: w.x2,
        y: w.y2,
        speed: phase2 ? 850 : 760
      };
    } else if (w.type === 'ember_ring') {
      const count = w.projectileCount || 12;
      for (let i = 0; i < count; i++) {
        const a = Math.PI * 2 * i / count;
        game.enemyProjectiles.push(game.makeEnemyProjectile(this.x, this.y, Math.cos(a), Math.sin(a), this.damage * 0.78, phase2 ? 250 : 215, 8, '#f49a52'));
      }
    } else if (w.type === 'void_cross') {
      // Match the four previewed arms one-for-one: three projectiles on each outward arm.
      for (const angle of w.crossProjectileAngles || []) {
        game.enemyProjectiles.push(game.makeEnemyProjectile(this.x, this.y, Math.cos(angle), Math.sin(angle), this.damage * 0.72, phase2 ? 285 : 250, 7, '#c49af2'));
      }
    } else if (w.type === 'void_pulse') {
      const count = phase2 ? 16 : 12;
      for (let i = 0; i < count; i++) {
        const a = i * Math.PI * 2 / count;
        game.enemyProjectiles.push(game.makeEnemyProjectile(this.x, this.y, Math.cos(a), Math.sin(a), this.damage * 0.82, phase2 ? 310 : 270, 8, '#a88ae8'));
      }
      game.hazards.push({ x: this.x, y: this.y, r: w.r, time: 0.72, maxTime: 0.72, damage: this.damage * 0.65, color: '#9b76db' });
    } else if (w.type === 'fan') {
      const angles = w.projectileAngles || [];
      for (const angle of angles) {
        game.enemyProjectiles.push(
          game.makeEnemyProjectile(
            this.x,
            this.y,
            Math.cos(angle),
            Math.sin(angle),
            this.damage,
            phase2 ? 270 : 225,
            7,
            '#e9869b'
          )
        );
      }
    } else if (w.type === 'rain') {
      for (const z of w.zones) {
        game.hazards.push({ x: z.x, y: z.y, r: z.r, time: 1.15, maxTime: 1.15, damage: this.damage, color: '#e34e58' });
      }
    } else if (w.type === 'fire_pillars') {
      for (const z of w.zones) {
        game.hazards.push({ x: z.x, y: z.y, r: z.r, time: 1.05, maxTime: 1.05, damage: this.damage * (phase2 ? 1.0 : 0.86), color: '#ff7848' });
      }
    } else if (w.type === 'ember_barrage') {
      for (let i = 0; i < w.barrageVolleys.length; i++) {
        this.pendingSalvos.push({
          time: 0.08 + i * 0.3,
          angles: w.barrageVolleys[i],
          damage: this.damage * (phase2 ? 0.58 : 0.5),
          speed: phase2 ? 295 : 260,
          radius: 7,
          color: '#ff9a55'
        });
      }
    } else if (w.type === 'summon') {
      game.spawnAdds(this.x, this.y, phase2 ? 2 : 1, 'stalker');
    } else if (w.type === 'slam') {
      game.hazards.push({
        x: w.x,
        y: w.y,
        r: w.r,
        time: 0.9,
        maxTime: 0.9,
        damage: this.damage * (phase2 ? 1.15 : 1),
        color: '#e34e58'
      });
      if (phase2) {
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4;
          game.enemyProjectiles.push(
            game.makeEnemyProjectile(this.x, this.y, Math.cos(angle), Math.sin(angle), this.damage * 0.55, 180, 5, '#f4ae7b')
          );
        }
      }
    }
    game.audio.play('boss');
  }

  draw(ctx) {
    if (this.warning) {
      const w = this.warning;
      const pulse = 0.55 + 0.35 * Math.sin((0.72 - w.time) * 18);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#ff3448';
      ctx.fillStyle = `rgba(255,35,55,${0.10 + 0.10 * pulse})`;
      ctx.shadowColor = '#ff263d';
      ctx.shadowBlur = 22;
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 6]);

      if (w.type === 'charge') {
        // Thick corridor represents the boss's body width along its locked charge path.
        ctx.save();
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(255,52,72,${0.13 + 0.08 * pulse})`;
        ctx.lineWidth = this.r * 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(w.x2, w.y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w.x2, w.y2, this.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (w.type === 'ember_ring') {
        const count = w.projectileCount || 12;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(this.x, this.y, w.r || 150, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < count; i++) {
          const angle = i * Math.PI * 2 / count;
          ctx.beginPath(); ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + Math.cos(angle) * (w.r || 150), this.y + Math.sin(angle) * (w.r || 150)); ctx.stroke();
        }
      } else if (w.type === 'void_cross') {
        // Draw the same 12 outward rays that executePattern will launch.
        ctx.setLineDash([]);
        for (const angle of w.crossProjectileAngles || []) {
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + Math.cos(angle) * w.range, this.y + Math.sin(angle) * w.range);
          ctx.stroke();
        }
      } else if (w.type === 'void_pulse') {
        ctx.setLineDash([]); ctx.beginPath(); ctx.arc(this.x, this.y, w.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        for (let i = 0; i < (w.projectileCount || 12); i++) { const angle = i * Math.PI * 2 / (w.projectileCount || 12); ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(angle) * w.r, this.y + Math.sin(angle) * w.r); ctx.stroke(); }
      } else if (w.type === 'fan') {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, w.range, w.angle - w.spread, w.angle + w.spread);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Show the exact rays that will become projectiles.
        ctx.setLineDash([5, 7]);
        for (const angle of w.projectileAngles) {
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x + Math.cos(angle) * w.range, this.y + Math.sin(angle) * w.range);
          ctx.stroke();
        }
      } else if (w.type === 'rain') {
        for (const z of w.zones) {
          ctx.beginPath();
          ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (w.type === 'fire_pillars') {
        ctx.setLineDash([]);
        for (const z of w.zones) {
          ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(z.x, z.y, z.r * 0.58, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (w.type === 'ember_barrage') {
        ctx.setLineDash([5, 7]);
        for (const volley of w.barrageVolleys) {
          for (const angle of volley) {
            ctx.beginPath(); ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(angle) * w.range, this.y + Math.sin(angle) * w.range); ctx.stroke();
          }
        }
      } else if (w.type === 'slam') {
        // The outer circle is the exact hazard radius used on impact.
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w.x, w.y, 12 + pulse * 8, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 22 + pulse * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    const flash = this.hitFlash > 0;
    ctx.save();
    ctx.shadowBlur = 32;
    ctx.shadowColor = this.color;
    ctx.fillStyle = flash ? '#fff' : this.color;
    ctx.strokeStyle = this.phase === 2 ? '#ffd1b0' : '#e7c4a7';
    ctx.lineWidth = this.phase === 2 ? 4 : 3;

    if (this.id === 'furnaceBeast') {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 8;
        const rr = this.r * (i % 2 === 0 ? 1.2 : 0.84);
        const x = this.x + Math.cos(a) * rr;
        const y = this.y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffcb79';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.id === 'abyssSovereign') {
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.PI / 8);
      ctx.beginPath();
      ctx.roundRect(-this.r * 0.86, -this.r * 0.86, this.r * 1.72, this.r * 1.72, 9);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(-Math.PI / 8);
      ctx.strokeStyle = '#d8baf4';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.r * 1.4, this.r * 0.48, gameSafeAngle(this.patternIndex), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#eee0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(-this.x, -this.y);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4c202d';
      ctx.beginPath();
      ctx.moveTo(this.x - this.r * 0.72, this.y - this.r * 0.38);
      ctx.lineTo(this.x - this.r * 1.18, this.y - this.r * 0.95);
      ctx.lineTo(this.x - this.r * 0.32, this.y - this.r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(this.x + this.r * 0.72, this.y - this.r * 0.38);
      ctx.lineTo(this.x + this.r * 1.18, this.y - this.r * 0.95);
      ctx.lineTo(this.x + this.r * 0.32, this.y - this.r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f1c0a0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.x - 13, this.y - this.r * 0.72);
      ctx.lineTo(this.x - 27, this.y - this.r - 13);
      ctx.lineTo(this.x - 3, this.y - this.r * 0.72);
      ctx.moveTo(this.x + 13, this.y - this.r * 0.72);
      ctx.lineTo(this.x + 27, this.y - this.r - 13);
      ctx.lineTo(this.x + 3, this.y - this.r * 0.72);
      ctx.stroke();
    }

    ctx.fillStyle = '#160f19';
    ctx.beginPath();
    ctx.arc(this.x - 13, this.y - 5, 5, 0, Math.PI * 2);
    ctx.arc(this.x + 13, this.y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.phase === 2 ? '#fff0cb' : '#ffb0a0';
    ctx.beginPath();
    ctx.arc(this.x - 13, this.y - 5, 2, 0, Math.PI * 2);
    ctx.arc(this.x + 13, this.y - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function gameSafeAngle(seed) {
  return (seed % 8) * Math.PI / 8;
}
