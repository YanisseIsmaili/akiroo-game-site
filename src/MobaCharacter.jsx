import React, { useState, useEffect, useRef } from 'react';

// Simulateur d'entraînement League of Legends - Esquive de skillshots
const LoLDodgeTrainer = () => {
  // Hitbox d'un champion moyen LoL : 65 unités de rayon
  // Convertir en pixels pour notre jeu (1 unité LoL ≈ 0.5 pixels)
  const CHAMPION_HITBOX_RADIUS = 32.5; // 65 unités LoL * 0.5
  
  const [position, setPosition] = useState({ x: 1000, y: 750 });
  const [targetPosition, setTargetPosition] = useState(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [skillshots, setSkillshots] = useState([]);
  const [score, setScore] = useState({ dodged: 0, hit: 0 });
  const [difficulty, setDifficulty] = useState('medium');
  const [difficultyMultiplier, setDifficultyMultiplier] = useState(1);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const skillshotAnimationRef = useRef(null);
  const nextSkillshotId = useRef(0);

  const MOVE_SPEED = 325; // Vitesse de mouvement moyenne LoL
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;

  // Skillshots réels de League of Legends avec statistiques précises
  const SKILLSHOT_TYPES = {
    // Hooks - Les plus craints
    THRESH_HOOK: {
      name: "Thresh Q (Death Sentence)",
      width: 35, // 70 unités LoL
      speed: 950, // 1900 vitesse LoL
      damage: 20,
      color: '#00ff88',
      trail: '#004433',
      castDelay: 500, // 0.5s cast time
      difficulty: 'hard'
    },
    BLITZ_HOOK: {
      name: "Blitzcrank Q (Rocket Grab)",
      width: 35,
      speed: 900,
      damage: 20,
      color: '#ffaa00',
      trail: '#664400',
      castDelay: 250,
      difficulty: 'hard'
    },
    NAUTILUS_HOOK: {
      name: "Nautilus Q (Dredge Line)",
      width: 45, // Plus large
      speed: 1050,
      damage: 18,
      color: '#2266ff',
      trail: '#001144',
      castDelay: 250,
      difficulty: 'medium'
    },
    
    // Snares/Bindings
    MORGANA_Q: {
      name: "Morgana Q (Dark Binding)",
      width: 35, // 70 unités
      speed: 600, // 1200 vitesse LoL - le plus lent
      damage: 15,
      color: '#9933ff',
      trail: '#330066',
      castDelay: 250,
      difficulty: 'easy' // Lent mais large
    },
    LUX_Q: {
      name: "Lux Q (Light Binding)",
      width: 35,
      speed: 600,
      damage: 15,
      color: '#ffff66',
      trail: '#666633',
      castDelay: 250,
      difficulty: 'easy'
    },
    
    // Dégâts skillshots
    EZREAL_Q: {
      name: "Ezreal Q (Mystic Shot)",
      width: 40, // 80 unités (réduit de 120)
      speed: 1000, // 2000 vitesse LoL
      damage: 12,
      color: '#ffdd00',
      trail: '#664400',
      castDelay: 250,
      difficulty: 'medium'
    },
    NIDALEE_Q: {
      name: "Nidalee Q (Javelin Toss)",
      width: 20, // Très fin
      speed: 650, // 1300 vitesse LoL
      damage: 25,
      color: '#ff6600',
      trail: '#662200',
      castDelay: 250,
      difficulty: 'medium' // Fin mais rapide
    },
    
    // AOE Skillshots
    XERATH_E: {
      name: "Xerath E (Shocking Orb)",
      width: 30,
      speed: 700,
      damage: 18,
      color: '#00ccff',
      trail: '#004466',
      castDelay: 500,
      difficulty: 'medium'
    },
    VELKOZ_Q: {
      name: "Vel'Koz Q (Plasma Fission)",
      width: 25,
      speed: 650,
      damage: 15,
      color: '#ff00ff',
      trail: '#660066',
      castDelay: 250,
      difficulty: 'hard' // Peut split
    }
  };

  const getDifficultySkillshots = (diff) => {
    const types = Object.values(SKILLSHOT_TYPES);
    if (diff === 'easy') {
      return types.filter(s => s.difficulty === 'easy' || s.difficulty === 'medium');
    } else if (diff === 'medium') {
      return types.filter(s => s.difficulty !== 'hard');
    } else {
      return types; // All skillshots
    }
  };

  const getSpawnRate = (diff) => {
    switch(diff) {
      case 'easy': return 2500;
      case 'medium': return 1800;
      case 'hard': return 800; // Beaucoup plus rapide !
      case 'insane': return 400; // EXTRÊME !!!
      default: return 1800;
    }
  };

  // Convertir coordonnées écran -> monde
  const screenToWorld = (screenX, screenY) => {
    return { x: screenX, y: screenY };
  };

  // Gestion du mouvement
  const updateTargetPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    const worldPos = screenToWorld(screenX, screenY);
    
    const clampedX = Math.max(CHAMPION_HITBOX_RADIUS, Math.min(CANVAS_WIDTH - CHAMPION_HITBOX_RADIUS, worldPos.x));
    const clampedY = Math.max(CHAMPION_HITBOX_RADIUS, Math.min(CANVAS_HEIGHT - CHAMPION_HITBOX_RADIUS, worldPos.y));
    
    setTargetPosition({ x: clampedX, y: clampedY });
  };

  const handleMouseDown = (e) => {
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

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  // Fonction pour spawn des skillshots réalistes
  const spawnSkillshot = () => {
    const availableSkillshots = getDifficultySkillshots(difficulty);
    const skillshotType = availableSkillshots[Math.floor(Math.random() * availableSkillshots.length)];
    
    // En mode hard, augmenter la vitesse des projectiles
    const speedMultiplier = difficulty === 'hard' ? 1.4 : difficulty === 'insane' ? 1.8 : 1;
    
    // Spawn depuis un bord aléatoire
    const side = Math.floor(Math.random() * 4);
    let startX, startY;
    
    switch(side) {
      case 0: startX = Math.random() * CANVAS_WIDTH; startY = -50; break;
      case 1: startX = CANVAS_WIDTH + 50; startY = Math.random() * CANVAS_HEIGHT; break;
      case 2: startX = Math.random() * CANVAS_WIDTH; startY = CANVAS_HEIGHT + 50; break;
      case 3: startX = -50; startY = Math.random() * CANVAS_HEIGHT; break;
    }

    // Viser vers le joueur avec de la prédiction (meilleure en mode difficile)
    const predictionRange = difficulty === 'hard' ? 50 : difficulty === 'insane' ? 20 : 100;
    const predictedX = position.x + (Math.random() - 0.5) * predictionRange;
    const predictedY = position.y + (Math.random() - 0.5) * predictionRange;
    const dx = predictedX - startX;
    const dy = predictedY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const angle = Math.atan2(dy, dx);

    const newSkillshot = {
      id: nextSkillshotId.current++,
      x: startX,
      y: startY,
      vx: (dx / distance) * skillshotType.speed * speedMultiplier,
      vy: (dy / distance) * skillshotType.speed * speedMultiplier,
      angle: angle,
      type: skillshotType,
      casting: true,
      castStartTime: performance.now()
    };

    setSkillshots(prev => [...prev, newSkillshot]);
  };

  // Régénération HP
  useEffect(() => {
    const regenInterval = setInterval(() => {
      setHp((currentHp) => {
        if (currentHp < maxHp && currentHp > 0) {
          // Moins de regen en mode difficile
          const regenAmount = difficulty === 'insane' ? 0.1 : difficulty === 'hard' ? 0.15 : 0.3;
          return Math.min(maxHp, currentHp + regenAmount);
        }
        return currentHp;
      });
    }, 100);

    return () => clearInterval(regenInterval);
  }, [maxHp, difficulty]);

  // Spawner des skillshots
  useEffect(() => {
    if (hp <= 0) return;
    
    const spawnInterval = setInterval(() => {
      spawnSkillshot();
    }, getSpawnRate(difficulty));

    return () => clearInterval(spawnInterval);
  }, [position, hp, difficulty]);

  // Animation du mouvement du personnage
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

        const newX = currentPos.x + dx * ratio;
        const newY = currentPos.y + dy * ratio;

        return {
          x: Math.max(CHAMPION_HITBOX_RADIUS, Math.min(CANVAS_WIDTH - CHAMPION_HITBOX_RADIUS, newX)),
          y: Math.max(CHAMPION_HITBOX_RADIUS, Math.min(CANVAS_HEIGHT - CHAMPION_HITBOX_RADIUS, newY))
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetPosition]);

  // Animation des skillshots
  useEffect(() => {
    let lastTime = performance.now();

    const animateSkillshots = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setSkillshots(prevSkillshots => {
        return prevSkillshots
          .map(shot => {
            // Vérifier si le cast time est écoulé
            if (shot.casting) {
              const timeSinceCast = currentTime - shot.castStartTime;
              if (timeSinceCast < shot.type.castDelay) {
                return shot; // Toujours en cast
              } else {
                return { ...shot, casting: false }; // Cast terminé
              }
            }

            // Déplacer le skillshot
            return {
              ...shot,
              x: shot.x + shot.vx * deltaTime,
              y: shot.y + shot.vy * deltaTime
            };
          })
          .filter(shot => {
            // Ne pas vérifier les collisions pendant le cast
            if (shot.casting) return true;

            // Vérifier collision avec le champion
            const dx = shot.x - position.x;
            const dy = shot.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < CHAMPION_HITBOX_RADIUS + shot.type.width) {
              // Touché !
              const damageMultiplier = difficulty === 'insane' ? 1.5 : difficulty === 'hard' ? 1.3 : 1;
              setHp(prev => Math.max(0, prev - (shot.type.damage * damageMultiplier)));
              setScore(prev => ({ ...prev, hit: prev.hit + 1 }));
              return false;
            }

            // Retirer les skillshots hors de l'écran
            if (shot.x < -200 || shot.x > CANVAS_WIDTH + 200 || 
                shot.y < -200 || shot.y > CANVAS_HEIGHT + 200) {
              // Esquivé !
              if (!shot.counted) {
                setScore(prev => ({ ...prev, dodged: prev.dodged + 1 }));
                shot.counted = true;
              }
              return false;
            }

            return true;
          });
      });

      skillshotAnimationRef.current = requestAnimationFrame(animateSkillshots);
    };

    skillshotAnimationRef.current = requestAnimationFrame(animateSkillshots);

    return () => {
      if (skillshotAnimationRef.current) {
        cancelAnimationFrame(skillshotAnimationRef.current);
      }
    };
  }, [position]);

  // Rendu du canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fond style Summoner's Rift
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a3d2e');
    gradient.addColorStop(1, '#1a5d4e');
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

    // Dessiner les skillshots
    skillshots.forEach(shot => {
      if (shot.casting) {
        // Indicateur de cast avec nom du sort
        const alpha = Math.sin(performance.now() / 100) * 0.3 + 0.5;
        
        // Cercle de warning
        ctx.strokeStyle = shot.type.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        // Cercle extérieur
        ctx.beginPath();
        ctx.arc(shot.x, shot.y, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        
        // Nom du sort qui va être lancé
        ctx.fillStyle = shot.type.color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(shot.type.name.split(' ')[0], shot.x, shot.y - 50); // Nom du champion
        ctx.fillText(shot.type.name.split(' ')[1], shot.x, shot.y - 35); // Lettre de la compétence
        ctx.shadowBlur = 0;
        
        return;
      }

      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(shot.angle);

      // Traînée
      const trailGradient = ctx.createLinearGradient(-shot.type.width * 4, 0, 0, 0);
      trailGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      trailGradient.addColorStop(1, shot.type.trail);
      ctx.fillStyle = trailGradient;
      ctx.fillRect(-shot.type.width * 4, -shot.type.width / 2, shot.type.width * 4, shot.type.width);

      // Corps du projectile
      const projGradient = ctx.createLinearGradient(-shot.type.width, 0, shot.type.width, 0);
      projGradient.addColorStop(0, shot.type.trail);
      projGradient.addColorStop(0.5, shot.type.color);
      projGradient.addColorStop(1, shot.type.trail);
      
      ctx.fillStyle = projGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, shot.type.width * 1.5, shot.type.width, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bordure lumineuse
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.restore();
      
      // Nom du sort au-dessus du projectile (une fois lancé)
      ctx.fillStyle = shot.type.color;
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 5;
      
      // Extraire juste le nom du champion et la lettre
      const championName = shot.type.name.split(' ')[0]; // Ex: "Thresh"
      const ability = shot.type.name.split(' ')[1]; // Ex: "Q"
      
      ctx.fillText(`${championName} ${ability}`, shot.x, shot.y - shot.type.width - 10);
      ctx.shadowBlur = 0;
    });

    // Dessiner le champion (cercle avec hitbox visible)
    // Hitbox (cercle rouge semi-transparent)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(position.x, position.y, CHAMPION_HITBOX_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Champion
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(position.x, position.y, CHAMPION_HITBOX_RADIUS * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Bordure
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Ombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(position.x, position.y + CHAMPION_HITBOX_RADIUS, CHAMPION_HITBOX_RADIUS * 0.8, CHAMPION_HITBOX_RADIUS * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Barre de vie
    const hpBarWidth = 60;
    const hpBarHeight = 8;
    const hpBarX = position.x - hpBarWidth / 2;
    const hpBarY = position.y - CHAMPION_HITBOX_RADIUS - 15;

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    const hpPercentage = hp / maxHp;
    ctx.fillStyle = hpPercentage > 0.5 ? '#27ae60' : hpPercentage > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercentage, hpBarHeight);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    // Indicateur de cible
    if (targetPosition) {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(targetPosition.x, targetPosition.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(targetPosition.x, targetPosition.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

  }, [position, targetPosition, hp, skillshots]);

  const resetGame = () => {
    setHp(maxHp);
    setSkillshots([]);
    setScore({ dodged: 0, hit: 0 });
    setPosition({ x: 1000, y: 750 });
    setTargetPosition(null);
  };

  const dodgeRate = score.dodged + score.hit > 0 
    ? ((score.dodged / (score.dodged + score.hit)) * 100).toFixed(1)
    : 0;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '20px',
      fontFamily: '"Beaufort for LOL", Arial, sans-serif',
      background: 'linear-gradient(135deg, #0a1428 0%, #1e3a5f 100%)',
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        color: '#f0e6d2',
        marginBottom: '10px',
        fontSize: '36px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
      }}>
        League of Legends - Dodge Trainer
      </h1>
      
      <p style={{ 
        color: '#c8aa6e',
        marginBottom: '20px',
        fontSize: '16px'
      }}>
        Entraîne-toi à esquiver les skillshots les plus redoutés de LoL !
        {difficulty === 'insane' && (
          <span style={{ 
            display: 'block', 
            color: '#ff00ff', 
            fontWeight: 'bold',
            marginTop: '5px',
            textShadow: '0 0 10px rgba(255, 0, 255, 0.8)'
          }}>
            ⚠️ MODE INSANE: Projectiles x1.8 plus rapides, spawn toutes les 0.4s, précision maximale !
          </span>
        )}
        {difficulty === 'hard' && (
          <span style={{ 
            display: 'block', 
            color: '#ff6666', 
            fontWeight: 'bold',
            marginTop: '5px'
          }}>
            ⚠️ MODE DIFFICILE: Projectiles x1.4 plus rapides, spawn toutes les 0.8s !
          </span>
        )}
      </p>

      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          onClick={() => setDifficulty('easy')}
          style={{
            padding: '10px 20px',
            backgroundColor: difficulty === 'easy' ? '#27ae60' : '#34495e',
            color: '#f0e6d2',
            border: '2px solid #c8aa6e',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          😊 Facile
        </button>
        <button 
          onClick={() => setDifficulty('medium')}
          style={{
            padding: '10px 20px',
            backgroundColor: difficulty === 'medium' ? '#f39c12' : '#34495e',
            color: '#f0e6d2',
            border: '2px solid #c8aa6e',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          😐 Moyen
        </button>
        <button 
          onClick={() => setDifficulty('hard')}
          style={{
            padding: '10px 20px',
            backgroundColor: difficulty === 'hard' ? '#e74c3c' : '#34495e',
            color: '#f0e6d2',
            border: '2px solid #c8aa6e',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          😰 Difficile
        </button>
        <button 
          onClick={() => setDifficulty('insane')}
          style={{
            padding: '10px 20px',
            backgroundColor: difficulty === 'insane' ? '#8e44ad' : '#34495e',
            color: '#f0e6d2',
            border: difficulty === 'insane' ? '2px solid #ff00ff' : '2px solid #c8aa6e',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: difficulty === 'insane' ? '0 0 15px rgba(255, 0, 255, 0.5)' : 'none',
            animation: difficulty === 'insane' ? 'pulse 1s infinite' : 'none'
          }}
        >
          💀 INSANE
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          border: '4px solid #c8aa6e',
          cursor: 'pointer',
          borderRadius: '8px',
          boxShadow: '0 0 20px rgba(200, 170, 110, 0.3)'
        }}
      />

      <div style={{ 
        marginTop: '20px', 
        textAlign: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '20px',
        borderRadius: '8px',
        border: '2px solid #c8aa6e'
      }}>
        <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', marginBottom: '15px' }}>
          <div>
            <p style={{ color: '#27ae60', fontSize: '18px', fontWeight: 'bold', margin: '5px 0' }}>
              ✓ Esquivés: {score.dodged}
            </p>
          </div>
          <div>
            <p style={{ color: '#e74c3c', fontSize: '18px', fontWeight: 'bold', margin: '5px 0' }}>
              ✗ Touchés: {score.hit}
            </p>
          </div>
          <div>
            <p style={{ color: '#f39c12', fontSize: '18px', fontWeight: 'bold', margin: '5px 0' }}>
              Taux: {dodgeRate}%
            </p>
          </div>
        </div>

        <p style={{ 
          color: hp > 60 ? '#27ae60' : hp > 30 ? '#f39c12' : '#e74c3c',
          fontSize: '20px',
          fontWeight: 'bold',
          margin: '10px 0'
        }}>
          HP: {Math.round(hp)} / {maxHp}
        </p>

        <p style={{ color: '#c8aa6e', fontSize: '14px', margin: '10px 0' }}>
          Hitbox: 65 unités (standard LoL) • Vitesse: 325
        </p>

        <button 
          onClick={resetGame}
          style={{
            marginTop: '15px',
            padding: '12px 30px',
            backgroundColor: '#c8aa6e',
            color: '#0a1428',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}
        >
          Réinitialiser
        </button>

        {hp <= 0 && (
          <p style={{ 
            marginTop: '15px', 
            color: '#e74c3c', 
            fontSize: '24px', 
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
          }}>
            💀 DEFEATED
          </p>
        )}
      </div>

      <div style={{ 
        marginTop: '20px',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '15px',
        borderRadius: '8px',
        border: '2px solid #c8aa6e',
        maxWidth: '1000px',
        width: '100%'
      }}>
        <h3 style={{ color: '#f0e6d2', marginTop: 0 }}>📖 Légende des Skillshots:</h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          marginTop: '15px'
        }}>
          <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #00ff88' }}>
            <strong style={{ color: '#00ff88' }}>🪝 Thresh Q</strong>
            <p style={{ color: '#c8aa6e', fontSize: '12px', margin: '5px 0 0 0' }}>Hook vert - RAPIDE</p>
          </div>
          
          <div style={{ background: 'rgba(255, 170, 0, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #ffaa00' }}>
            <strong style={{ color: '#ffaa00' }}>🪝 Blitz Q</strong>
            <p style={{ color: '#c8aa6e', fontSize: '12px', margin: '5px 0 0 0' }}>Hook orange - RAPIDE</p>
          </div>
          
          <div style={{ background: 'rgba(34, 102, 255, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #2266ff' }}>
            <strong style={{ color: '#2266ff' }}>⚓ Nautilus Q</strong>
            <p style={{ color: '#c8aa6e', fontSize: '12px', margin: '5px 0 0 0' }}>Hook bleu - LARGE</p>
          </div>
          
          <div style={{ background: 'rgba(153, 51, 255, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #9933ff' }}>
            <strong style={{ color: '#9933ff' }}>🌀 Morgana Q</strong>
            <p style={{ color: '#c8aa6e', fontSize: '12px', margin: '5px 0 0 0' }}>Snare violet - LENT</p>
          </div>
          
          <div style={{ background: 'rgba(255, 255, 102, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #ffff66' }}>
            <strong style={{ color: '#ffff66' }}>✨ Lux Q</strong>
            <p style={{ color: '#c8aa6e', fontSize: '12px', margin: '5px 0 0 0' }}>Snare jaune - LENT</p>
          </div>
          
          <div style={{ background: 'rgba(255, 221, 0, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #ffdd00' }}>
            <strong style={{ color: '#ffdd00' }}>⚡ Ezreal Q</strong>
            <p style={{ color: '#c8aa6e', fontSize: '12px', margin: '5px 0 0 0' }}>Doré - Moyen</p>
          </div>
          
          <div style={{ background: 'rgba(255, 102, 0, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #ff6600' }}>
            <strong style={{ color: '#ff6600' }}>🗡️ Nidalee Q</strong>
            <p style={{ color: '#c8aa6e', fontSize: '12px', margin: '5px 0 0 0' }}>Spear orange - MORTEL</p>
          </div>
          
          <div style={{ background: 'rgba(0, 204, 255, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #00ccff' }}>
            <strong style={{ color: '#00ccff' }}>⚡ Xerath E</strong>
            <p style={{ color: '#c8aa6e', fontSize: '12px', margin: '5px 0 0 0' }}>Stun cyan</p>
          </div>
          
          <div style={{ background: 'rgba(255, 0, 255, 0.1)', padding: '10px', borderRadius: '4px', border: '1px solid #ff00ff' }}>
            <strong style={{ color: '#ff00ff' }}>👁️ Vel'Koz Q</strong>
            <p style={{ color: '#c8aa6e', fontSize: '12px', margin: '5px 0 0 0' }}>Magenta - Peut split</p>
          </div>
        </div>
        
        <p style={{ color: '#c8aa6e', fontSize: '12px', fontStyle: 'italic', marginTop: '15px', textAlign: 'center' }}>
          💡 Astuce: Le nom du sort s'affiche au-dessus de chaque projectile pendant le cast et en vol !
        </p>
      </div>
    </div>
  );
};

export default LoLDodgeTrainer;