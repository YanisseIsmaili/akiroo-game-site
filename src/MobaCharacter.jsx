import React, { useState, useEffect, useRef } from 'react';

// Jeu de survie avec vagues de mobs, XP, levels et capacités
const MobSurvivor = () => {
  // Stats du joueur
  const [position, setPosition] = useState({ x: 600, y: 400 });
  const [targetPosition, setTargetPosition] = useState(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  
  // Mobs et vagues
  const [mobs, setMobs] = useState([]);
  const [wave, setWave] = useState(1);
  const [waveActive, setWaveActive] = useState(false);
  const [mobsInWave, setMobsInWave] = useState(0);
  const [mobsKilled, setMobsKilled] = useState(0);
  
  // Stats du jeu
  const [gold, setGold] = useState(0);
  const [totalKills, setTotalKills] = useState(0);
  
  // Capacités
  const [abilities, setAbilities] = useState({
    basicAttack: { damage: 10, cooldown: 3000, lastUsed: 0 },
    fireball: { unlocked: false, damage: 30, cooldown: 2000, lastUsed: 0 },
    lightning: { unlocked: false, damage: 50, cooldown: 3000, lastUsed: 0 },
    shield: { unlocked: false, duration: 3000, cooldown: 5000, lastUsed: 0, active: false },
    dash: { unlocked: false, distance: 200, cooldown: 1500, lastUsed: 0 }
  });
  const [shieldActive, setShieldActive] = useState(false);
  const [projectiles, setProjectiles] = useState([]);
  
  // Refs
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const mobAnimationRef = useRef(null);
  const projectileAnimationRef = useRef(null);
  const nextMobId = useRef(0);
  const nextProjectileId = useRef(0);
  
  const MOVE_SPEED = 350;
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;
  const CHAMPION_HITBOX_RADIUS = 32.5;

  // Types de mobs
  const MOB_TYPES = {
    SLIME: {
      name: 'Slime',
      radius: 25,
      speed: 100,
      hp: 20,
      damage: 8,
      color: '#2ecc71',
      attackRange: 40,
      attackCooldown: 1200,
      xp: 10,
      gold: 5
    },
    GOBLIN: {
      name: 'Goblin',
      radius: 28,
      speed: 130,
      hp: 35,
      damage: 12,
      color: '#e74c3c',
      attackRange: 45,
      attackCooldown: 1000,
      xp: 15,
      gold: 10
    },
    ORC: {
      name: 'Orc',
      radius: 35,
      speed: 80,
      hp: 80,
      damage: 20,
      color: '#8e44ad',
      attackRange: 50,
      attackCooldown: 1500,
      xp: 30,
      gold: 20
    },
    DEMON: {
      name: 'Demon',
      radius: 40,
      speed: 150,
      hp: 120,
      damage: 30,
      color: '#c0392b',
      attackRange: 55,
      attackCooldown: 800,
      xp: 50,
      gold: 50
    }
  };

  // Démarrer une vague
  const startWave = () => {
    setWaveActive(true);
    const numMobs = 5 + (wave - 1) * 3; // Plus de mobs à chaque vague
    setMobsInWave(numMobs);
    setMobsKilled(0);
    
    // Spawner les mobs de la vague
    for (let i = 0; i < numMobs; i++) {
      setTimeout(() => {
        spawnMob();
      }, i * 500); // Spawn progressif
    }
  };

  // Spawner un mob
  const spawnMob = () => {
    let mobType;
    
    // Choisir le type selon la vague
    if (wave <= 2) {
      mobType = MOB_TYPES.SLIME;
    } else if (wave <= 5) {
      mobType = Math.random() < 0.6 ? MOB_TYPES.SLIME : MOB_TYPES.GOBLIN;
    } else if (wave <= 10) {
      const rand = Math.random();
      if (rand < 0.4) mobType = MOB_TYPES.SLIME;
      else if (rand < 0.8) mobType = MOB_TYPES.GOBLIN;
      else mobType = MOB_TYPES.ORC;
    } else {
      const rand = Math.random();
      if (rand < 0.3) mobType = MOB_TYPES.GOBLIN;
      else if (rand < 0.6) mobType = MOB_TYPES.ORC;
      else mobType = MOB_TYPES.DEMON;
    }

    // Spawn depuis un bord aléatoire
    const side = Math.floor(Math.random() * 4);
    let startX, startY;
    
    switch(side) {
      case 0: startX = Math.random() * CANVAS_WIDTH; startY = -50; break;
      case 1: startX = CANVAS_WIDTH + 50; startY = Math.random() * CANVAS_HEIGHT; break;
      case 2: startX = Math.random() * CANVAS_WIDTH; startY = CANVAS_HEIGHT + 50; break;
      case 3: startX = -50; startY = Math.random() * CANVAS_HEIGHT; break;
    }

    // Augmenter les stats selon la vague
    const waveMultiplier = 1 + (wave - 1) * 0.15;

    const newMob = {
      id: nextMobId.current++,
      x: startX,
      y: startY,
      type: mobType,
      hp: Math.round(mobType.hp * waveMultiplier),
      maxHp: Math.round(mobType.hp * waveMultiplier),
      damage: Math.round(mobType.damage * waveMultiplier),
      lastAttackTime: 0
    };

    setMobs(prev => [...prev, newMob]);
  };

  // Tirer un projectile (attaque de base) - maintenant sur ESPACE avec cooldown
  const shootProjectile = () => {
    const now = performance.now();
    if (now - abilities.basicAttack.lastUsed < abilities.basicAttack.cooldown) return;

    // Trouver le mob le plus proche pour viser
    let closestMob = null;
    let minDist = Infinity;
    
    mobs.forEach(mob => {
      const dist = Math.sqrt((mob.x - position.x) ** 2 + (mob.y - position.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closestMob = mob;
      }
    });

    if (!closestMob) return; // Pas de mob à viser

    const dx = closestMob.x - position.x;
    const dy = closestMob.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 500;

    const newProjectile = {
      id: nextProjectileId.current++,
      x: position.x,
      y: position.y,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      damage: 10 + (level * 2),
      radius: 8,
      color: '#f1c40f',
      type: 'basic'
    };

    setProjectiles(prev => [...prev, newProjectile]);
    setAbilities(prev => ({
      ...prev,
      basicAttack: { ...prev.basicAttack, lastUsed: now }
    }));
  };

  // Utiliser Fireball
  const useFireball = () => {
    if (!abilities.fireball.unlocked) return;
    const now = performance.now();
    if (now - abilities.fireball.lastUsed < abilities.fireball.cooldown) return;

    // Trouver le mob le plus proche
    let closestMob = null;
    let minDist = Infinity;
    
    mobs.forEach(mob => {
      const dist = Math.sqrt((mob.x - position.x) ** 2 + (mob.y - position.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closestMob = mob;
      }
    });

    if (!closestMob) return;

    const dx = closestMob.x - position.x;
    const dy = closestMob.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 400;

    const newProjectile = {
      id: nextProjectileId.current++,
      x: position.x,
      y: position.y,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      damage: abilities.fireball.damage,
      radius: 15,
      color: '#ff6b35',
      type: 'fireball'
    };

    setProjectiles(prev => [...prev, newProjectile]);
    setAbilities(prev => ({
      ...prev,
      fireball: { ...prev.fireball, lastUsed: now }
    }));
  };

  // Utiliser Lightning
  const useLightning = () => {
    if (!abilities.lightning.unlocked) return;
    const now = performance.now();
    if (now - abilities.lightning.lastUsed < abilities.lightning.cooldown) return;

    // Frappe tous les mobs proches
    setMobs(prev => prev.map(mob => {
      const dist = Math.sqrt((mob.x - position.x) ** 2 + (mob.y - position.y) ** 2);
      if (dist < 250) {
        return { ...mob, hp: mob.hp - abilities.lightning.damage };
      }
      return mob;
    }));

    setAbilities(prev => ({
      ...prev,
      lightning: { ...prev.lightning, lastUsed: now }
    }));
  };

  // Utiliser Shield
  const useShield = () => {
    if (!abilities.shield.unlocked) return;
    const now = performance.now();
    if (now - abilities.shield.lastUsed < abilities.shield.cooldown) return;

    setShieldActive(true);
    setAbilities(prev => ({
      ...prev,
      shield: { ...prev.shield, lastUsed: now, active: true }
    }));

    setTimeout(() => {
      setShieldActive(false);
      setAbilities(prev => ({
        ...prev,
        shield: { ...prev.shield, active: false }
      }));
    }, abilities.shield.duration);
  };

  // Utiliser Dash (maintenant sur Q)
  const useDash = () => {
    if (!abilities.dash.unlocked) return;
    const now = performance.now();
    if (now - abilities.dash.lastUsed < abilities.dash.cooldown) return;

    if (!targetPosition) return;

    const dx = targetPosition.x - position.x;
    const dy = targetPosition.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const dashDist = Math.min(abilities.dash.distance, distance);
    const newX = position.x + (dx / distance) * dashDist;
    const newY = position.y + (dy / distance) * dashDist;

    setPosition({
      x: Math.max(CHAMPION_HITBOX_RADIUS, Math.min(CANVAS_WIDTH - CHAMPION_HITBOX_RADIUS, newX)),
      y: Math.max(CHAMPION_HITBOX_RADIUS, Math.min(CANVAS_HEIGHT - CHAMPION_HITBOX_RADIUS, newY))
    });

    setAbilities(prev => ({
      ...prev,
      dash: { ...prev.dash, lastUsed: now }
    }));
  };

  // Gestion clavier
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        shootProjectile(); // Attaque de base sur ESPACE
      }
      if (e.key === 'q' || e.key === 'Q') useDash(); // Dash sur Q
      if (e.key === 'w' || e.key === 'W') useFireball(); // Fireball sur W
      if (e.key === 'e' || e.key === 'E') useLightning(); // Lightning sur E
      if (e.key === 'r' || e.key === 'R') useShield(); // Shield sur R
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [abilities, targetPosition, mobs, position]);

  // Gestion du mouvement
  const updateTargetPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    setTargetPosition({ x: screenX, y: screenY });
  };

  const handleMouseDown = (e) => {
    // Tous les clics servent maintenant au déplacement
    e.preventDefault();
    setIsMouseDown(true);
    updateTargetPosition(e);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e) => {
    if (isMouseDown) {
      updateTargetPosition(e);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  // Animation du mouvement
  useEffect(() => {
    if (!targetPosition) return;

    let lastTime = performance.now();

    const animate = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setPosition((currentPos) => {
        const dx = targetPosition.x - currentPos.x;
        const dy = targetPosition.y - currentPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
          setTargetPosition(null);
          return currentPos;
        }

        const moveDistance = MOVE_SPEED * deltaTime;
        const ratio = Math.min(moveDistance / distance, 1);

        return {
          x: Math.max(CHAMPION_HITBOX_RADIUS, Math.min(CANVAS_WIDTH - CHAMPION_HITBOX_RADIUS, currentPos.x + dx * ratio)),
          y: Math.max(CHAMPION_HITBOX_RADIUS, Math.min(CANVAS_HEIGHT - CHAMPION_HITBOX_RADIUS, currentPos.y + dy * ratio))
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [targetPosition]);

  // Animation des mobs
  useEffect(() => {
    let lastTime = performance.now();

    const animateMobs = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setMobs(prevMobs => {
        return prevMobs
          .map(mob => {
            const dx = position.x - mob.x;
            const dy = position.y - mob.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < mob.type.attackRange + CHAMPION_HITBOX_RADIUS) {
              if (currentTime - mob.lastAttackTime > mob.type.attackCooldown) {
                if (!shieldActive) {
                  setHp(prev => Math.max(0, prev - mob.damage));
                }
                return { ...mob, lastAttackTime: currentTime };
              }
              return mob;
            }
            
            const moveX = (dx / distance) * mob.type.speed * deltaTime;
            const moveY = (dy / distance) * mob.type.speed * deltaTime;

            return {
              ...mob,
              x: mob.x + moveX,
              y: mob.y + moveY
            };
          })
          .filter(mob => {
            if (mob.hp <= 0) {
              setXp(prev => prev + mob.type.xp);
              setGold(prev => prev + mob.type.gold);
              setTotalKills(prev => prev + 1);
              setMobsKilled(prev => prev + 1);
              return false;
            }
            return true;
          });
      });

      mobAnimationRef.current = requestAnimationFrame(animateMobs);
    };

    mobAnimationRef.current = requestAnimationFrame(animateMobs);
    return () => cancelAnimationFrame(mobAnimationRef.current);
  }, [position, shieldActive]);

  // Animation des projectiles
  useEffect(() => {
    let lastTime = performance.now();

    const animateProjectiles = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setProjectiles(prevProj => {
        return prevProj
          .map(proj => ({
            ...proj,
            x: proj.x + proj.vx * deltaTime,
            y: proj.y + proj.vy * deltaTime
          }))
          .filter(proj => {
            let hit = false;
            
            setMobs(prevMobs => prevMobs.map(mob => {
              if (hit) return mob;
              const dist = Math.sqrt((proj.x - mob.x) ** 2 + (proj.y - mob.y) ** 2);
              if (dist < mob.type.radius + proj.radius) {
                hit = true;
                return { ...mob, hp: mob.hp - proj.damage };
              }
              return mob;
            }));

            if (hit) return false;
            if (proj.x < 0 || proj.x > CANVAS_WIDTH || proj.y < 0 || proj.y > CANVAS_HEIGHT) {
              return false;
            }
            return true;
          });
      });

      projectileAnimationRef.current = requestAnimationFrame(animateProjectiles);
    };

    projectileAnimationRef.current = requestAnimationFrame(animateProjectiles);
    return () => cancelAnimationFrame(projectileAnimationRef.current);
  }, []);

  // Level up
  useEffect(() => {
    if (xp >= xpToNextLevel) {
      setLevel(prev => prev + 1);
      setXp(prev => prev - xpToNextLevel);
      setXpToNextLevel(prev => Math.round(prev * 1.5));
      setMaxHp(prev => prev + 20);
      setHp(prev => prev + 20);
    }
  }, [xp, xpToNextLevel]);

  // Vérifier fin de vague
  useEffect(() => {
    if (waveActive && mobsKilled >= mobsInWave && mobs.length === 0) {
      setWaveActive(false);
    }
  }, [mobsKilled, mobsInWave, mobs, waveActive]);

  // Rendu canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Fond
    const gradient = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 0, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 600);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grille
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }

    // Dessiner projectiles
    projectiles.forEach(proj => {
      ctx.save();
      
      // Glow
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 15;
      
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // Dessiner mobs
    mobs.forEach(mob => {
      const dx = position.x - mob.x;
      const dy = position.y - mob.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isAttacking = dist < mob.type.attackRange + CHAMPION_HITBOX_RADIUS;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(mob.x + 2, mob.y + mob.type.radius + 2, mob.type.radius * 0.8, mob.type.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      const pulse = isAttacking ? Math.sin(performance.now() / 200) * 3 : 0;
      
      const mobGrad = ctx.createRadialGradient(mob.x, mob.y - 5, 0, mob.x, mob.y, mob.type.radius + pulse);
      mobGrad.addColorStop(0, mob.type.color);
      mobGrad.addColorStop(1, '#000');
      ctx.fillStyle = mobGrad;
      ctx.beginPath();
      ctx.arc(mob.x, mob.y, mob.type.radius + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isAttacking ? '#ff0000' : '#2c3e50';
      ctx.lineWidth = isAttacking ? 3 : 2;
      ctx.stroke();

      // HP bar
      const hpBarW = mob.type.radius * 2.5;
      const hpBarH = 6;
      const hpBarX = mob.x - hpBarW / 2;
      const hpBarY = mob.y - mob.type.radius - 12;

      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

      const hpPct = mob.hp / mob.maxHp;
      ctx.fillStyle = hpPct > 0.5 ? '#27ae60' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, hpBarH);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
    });

    // Dessiner joueur
    if (shieldActive) {
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 4;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(position.x, position.y, CHAMPION_HITBOX_RADIUS + 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(position.x, position.y, CHAMPION_HITBOX_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 3;
    ctx.stroke();

    // HP bar joueur
    const hpBarW = 60;
    const hpBarH = 8;
    const hpBarX = position.x - hpBarW / 2;
    const hpBarY = position.y - CHAMPION_HITBOX_RADIUS - 15;

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

    const hpPct = hp / maxHp;
    ctx.fillStyle = hpPct > 0.5 ? '#27ae60' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, hpBarH);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

  }, [position, mobs, projectiles, hp, maxHp, shieldActive]);

  const canLevelUp = level === 3 && !abilities.fireball.unlocked ||
                      level === 5 && !abilities.lightning.unlocked ||
                      level === 7 && !abilities.shield.unlocked ||
                      level === 10 && !abilities.dash.unlocked;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      minHeight: '100vh',
      color: '#fff'
    }}>
      <h1 style={{ marginBottom: '10px', color: '#f39c12' }}>⚔️ MOB SURVIVOR ⚔️</h1>
      
      <div style={{ display: 'flex', gap: '30px', marginBottom: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '5px 0', fontSize: '16px', color: '#3498db' }}>Level {level}</p>
          <div style={{ width: '150px', height: '10px', background: '#2c3e50', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ width: `${(xp / xpToNextLevel) * 100}%`, height: '100%', background: '#9b59b6' }}></div>
          </div>
          <p style={{ margin: '5px 0', fontSize: '12px', color: '#bdc3c7' }}>{xp}/{xpToNextLevel} XP</p>
        </div>
        
        <p style={{ margin: '5px 0', fontSize: '16px', color: '#e74c3c' }}>❤️ HP: {Math.round(hp)}/{maxHp}</p>
        <p style={{ margin: '5px 0', fontSize: '16px', color: '#f1c40f' }}>💰 Gold: {gold}</p>
        <p style={{ margin: '5px 0', fontSize: '16px', color: '#9b59b6' }}>🗡️ Kills: {totalKills}</p>
        <p style={{ margin: '5px 0', fontSize: '16px', color: '#e67e22' }}>🌊 Vague: {wave}</p>
      </div>

      {/* Indicateur de cooldown attaque de base */}
      <div style={{ marginBottom: '15px' }}>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#f1c40f', textAlign: 'center' }}>
          ⚡ Attaque de base (ESPACE): 
          {(() => {
            const now = performance.now();
            const timeSince = now - abilities.basicAttack.lastUsed;
            const timeLeft = Math.max(0, abilities.basicAttack.cooldown - timeSince);
            return timeLeft > 0 ? ` ${(timeLeft / 1000).toFixed(1)}s` : ' PRÊT!';
          })()}
        </p>
      </div>

      {canLevelUp && (
        <div style={{ 
          background: 'rgba(255, 215, 0, 0.2)', 
          border: '2px solid gold',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f1c40f' }}>🎉 NOUVELLE CAPACITÉ DÉBLOQUÉE !</h3>
          {level === 3 && !abilities.fireball.unlocked && (
            <button onClick={() => setAbilities(p => ({...p, fireball: {...p.fireball, unlocked: true}}))}
              style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '4px' }}>
              🔥 Débloquer FIREBALL (W) - 30 dégâts
            </button>
          )}
          {level === 5 && !abilities.lightning.unlocked && (
            <button onClick={() => setAbilities(p => ({...p, lightning: {...p.lightning, unlocked: true}}))}
              style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px' }}>
              ⚡ Débloquer LIGHTNING (E) - AOE 50 dégâts
            </button>
          )}
          {level === 7 && !abilities.shield.unlocked && (
            <button onClick={() => setAbilities(p => ({...p, shield: {...p.shield, unlocked: true}}))}
              style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#9b59b6', color: '#fff', border: 'none', borderRadius: '4px' }}>
              🛡️ Débloquer SHIELD (R) - 3s invincibilité
            </button>
          )}
          {level === 10 && !abilities.dash.unlocked && (
            <button onClick={() => setAbilities(p => ({...p, dash: {...p.dash, unlocked: true}}))}
              style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px' }}>
              💨 Débloquer DASH (Q) - Téléportation rapide
            </button>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{
          border: '4px solid #f39c12',
          cursor: 'crosshair',
          borderRadius: '8px',
          marginBottom: '15px'
        }}
      />

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
        <button onClick={startWave} disabled={waveActive || hp <= 0}
          style={{ padding: '15px 30px', fontSize: '18px', cursor: waveActive ? 'not-allowed' : 'pointer', 
                   background: waveActive ? '#7f8c8d' : '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          {waveActive ? `Vague ${wave} en cours... (${mobsKilled}/${mobsInWave})` : `🌊 Démarrer Vague ${wave}`}
        </button>
        
        <button onClick={shootProjectile}
          style={{ padding: '10px 20px', background: '#f1c40f', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          ⚡ Attaque (ESPACE)
        </button>
        
        {abilities.dash.unlocked && (
          <button onClick={useDash}
            style={{ padding: '10px 20px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            💨 Dash (Q)
          </button>
        )}
        {abilities.fireball.unlocked && (
          <button onClick={useFireball}
            style={{ padding: '10px 20px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            🔥 Fireball (W)
          </button>
        )}
        {abilities.lightning.unlocked && (
          <button onClick={useLightning}
            style={{ padding: '10px 20px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            ⚡ Lightning (E)
          </button>
        )}
        {abilities.shield.unlocked && (
          <button onClick={useShield} disabled={shieldActive}
            style={{ padding: '10px 20px', background: shieldActive ? '#7f8c8d' : '#9b59b6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            🛡️ Shield (R) {shieldActive ? 'ACTIF' : ''}
          </button>
        )}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '8px', maxWidth: '800px' }}>
        <h3 style={{ marginTop: 0 }}>🎮 Contrôles:</h3>
        <p>• <strong>Clic Gauche/Droit</strong>: Se déplacer</p>
        <p>• <strong>ESPACE</strong>: 💥 Attaquer (CD: 3s) - Vise automatiquement le mob le plus proche</p>
        <p>• <strong>Q</strong>: 💨 Dash (débloqué lvl 10)</p>
        <p>• <strong>W</strong>: 🔥 Fireball (débloqué lvl 3)</p>
        <p>• <strong>E</strong>: ⚡ Lightning AOE (débloqué lvl 5)</p>
        <p>• <strong>R</strong>: 🛡️ Shield (débloqué lvl 7)</p>
      </div>

      {hp <= 0 && (
        <div style={{ marginTop: '20px', background: 'rgba(231, 76, 60, 0.8)', padding: '20px', borderRadius: '8px' }}>
          <h2 style={{ margin: 0 }}>💀 GAME OVER 💀</h2>
          <p>Vague atteinte: {wave}</p>
          <p>Kills totaux: {totalKills}</p>
          <button onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '4px' }}>
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
};

export default MobSurvivor;