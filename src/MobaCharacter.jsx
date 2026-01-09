import React, { useState, useEffect, useRef } from 'react';

const MobaCharacter = () => {
  const [position, setPosition] = useState({ x: 400, y: 300 });
  const [targetPosition, setTargetPosition] = useState(null);
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [cameraLocked, setCameraLocked] = useState(true);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [projectiles, setProjectiles] = useState([]);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const projectileAnimationRef = useRef(null);
  const nextProjectileId = useRef(0);

  const MOVE_SPEED = 200; // pixels par seconde
  const CHARACTER_SIZE = 30;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const WORLD_WIDTH = 2000;
  const WORLD_HEIGHT = 1500;

  // Types de projectiles inspirés d'Ezreal
  const PROJECTILE_TYPES = {
    Q_MYSTIC_SHOT: {
      width: 12, // 80 unités LoL converti pour notre jeu
      speed: 300, // Rapide comme le Q d'Ezreal
      damage: 15,
      color: '#FFD700', // Doré
      name: 'Mystic Shot'
    },
    W_ESSENCE_FLUX: {
      width: 10, // Un peu plus fin
      speed: 250, // Moyennement rapide
      damage: 12,
      color: '#00CED1', // Cyan
      name: 'Essence Flux'
    },
    R_TRUESHOT: {
      width: 25, // Large comme l'ulti d'Ezreal
      speed: 200, // Plus lent mais plus gros
      damage: 30,
      color: '#FF4500', // Orange-Rouge
      name: 'Trueshot Barrage'
    }
  };

  // Convertir les coordonnées écran en coordonnées monde
  const screenToWorld = (screenX, screenY) => {
    const offsetX = cameraLocked 
      ? position.x - CANVAS_WIDTH / 2 
      : cameraOffset.x;
    const offsetY = cameraLocked 
      ? position.y - CANVAS_HEIGHT / 2 
      : cameraOffset.y;
    
    return {
      x: screenX + offsetX,
      y: screenY + offsetY
    };
  };

  // Convertir les coordonnées monde en coordonnées écran
  const worldToScreen = (worldX, worldY) => {
    const offsetX = cameraLocked 
      ? position.x - CANVAS_WIDTH / 2 
      : cameraOffset.x;
    const offsetY = cameraLocked 
      ? position.y - CANVAS_HEIGHT / 2 
      : cameraOffset.y;
    
    return {
      x: worldX - offsetX,
      y: worldY - offsetY
    };
  };

  // Fonction pour infliger des dégâts
  const takeDamage = (damage) => {
    setHp((currentHp) => Math.max(0, currentHp - damage));
  };

  // Fonction pour soigner
  const heal = (amount) => {
    setHp((currentHp) => Math.min(maxHp, currentHp + amount));
  };

  // Régénération automatique
  useEffect(() => {
    const regenInterval = setInterval(() => {
      setHp((currentHp) => {
        if (currentHp < maxHp && currentHp > 0) {
          return Math.min(maxHp, currentHp + 0.5);
        }
        return currentHp;
      });
    }, 100);

    return () => clearInterval(regenInterval);
  }, [maxHp]);

  // Gestion du clavier pour le camera lock
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleCameraLock();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cameraLocked, position]);

  // Spawner des projectiles régulièrement
  useEffect(() => {
    const spawnInterval = setInterval(() => {
      if (hp > 0) { // Ne pas spawner si le personnage est mort
        spawnProjectile();
      }
    }, 1500); // Un projectile toutes les 1.5 secondes

    return () => clearInterval(spawnInterval);
  }, [position, hp]);

  // Animation des projectiles
  useEffect(() => {
    let lastTime = performance.now();

    const animateProjectiles = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setProjectiles(prevProjectiles => {
        const updatedProjectiles = prevProjectiles
          .map(proj => ({
            ...proj,
            x: proj.x + proj.vx * deltaTime,
            y: proj.y + proj.vy * deltaTime
          }))
          .filter(proj => {
            // Vérifier collision avec le personnage (utilise la largeur du projectile)
            const dx = proj.x - position.x;
            const dy = proj.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < CHARACTER_SIZE / 2 + proj.type.width) {
              // Collision ! Infliger des dégâts selon le type de projectile
              takeDamage(proj.type.damage);
              return false; // Retirer le projectile
            }

            // Retirer les projectiles hors du monde
            if (proj.x < -100 || proj.x > WORLD_WIDTH + 100 || 
                proj.y < -100 || proj.y > WORLD_HEIGHT + 100) {
              return false;
            }

            return true;
          });

        return updatedProjectiles;
      });

      projectileAnimationRef.current = requestAnimationFrame(animateProjectiles);
    };

    projectileAnimationRef.current = requestAnimationFrame(animateProjectiles);

    return () => {
      if (projectileAnimationRef.current) {
        cancelAnimationFrame(projectileAnimationRef.current);
      }
    };
  }, [position]);

  // Gérer le clic sur le canvas
  const updateTargetPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    const worldPos = screenToWorld(screenX, screenY);
    
    // Limiter la position dans les limites du monde
    const clampedX = Math.max(CHARACTER_SIZE, Math.min(WORLD_WIDTH - CHARACTER_SIZE, worldPos.x));
    const clampedY = Math.max(CHARACTER_SIZE, Math.min(WORLD_HEIGHT - CHARACTER_SIZE, worldPos.y));
    
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

  // Toggle camera lock
  const toggleCameraLock = () => {
    if (!cameraLocked) {
      // Si on verrouille, on centre sur le personnage
      setCameraLocked(true);
    } else {
      // Si on déverrouille, on garde l'offset actuel
      setCameraOffset({
        x: position.x - CANVAS_WIDTH / 2,
        y: position.y - CANVAS_HEIGHT / 2
      });
      setCameraLocked(false);
    }
  };

  // Créer un projectile depuis un bord aléatoire
  const spawnProjectile = () => {
    const side = Math.floor(Math.random() * 4); // 0: haut, 1: droite, 2: bas, 3: gauche
    let startX, startY;
    
    switch(side) {
      case 0: // Haut
        startX = Math.random() * WORLD_WIDTH;
        startY = 0;
        break;
      case 1: // Droite
        startX = WORLD_WIDTH;
        startY = Math.random() * WORLD_HEIGHT;
        break;
      case 2: // Bas
        startX = Math.random() * WORLD_WIDTH;
        startY = WORLD_HEIGHT;
        break;
      case 3: // Gauche
        startX = 0;
        startY = Math.random() * WORLD_HEIGHT;
        break;
    }

    // Choisir un type de projectile aléatoire
    const types = Object.values(PROJECTILE_TYPES);
    const projectileType = types[Math.floor(Math.random() * types.length)];

    // Calculer la direction vers le personnage avec un peu d'aléatoire
    const targetX = position.x + (Math.random() - 0.5) * 200;
    const targetY = position.y + (Math.random() - 0.5) * 200;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const newProjectile = {
      id: nextProjectileId.current++,
      x: startX,
      y: startY,
      vx: (dx / distance) * projectileType.speed,
      vy: (dy / distance) * projectileType.speed,
      type: projectileType,
      angle: Math.atan2(dy, dx)
    };

    setProjectiles(prev => [...prev, newProjectile]);
  };

  // Animation du mouvement
  useEffect(() => {
    if (!targetPosition) return;

    let lastTime = performance.now();

    const animate = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000; // en secondes
      lastTime = currentTime;

      setPosition((currentPos) => {
        const dx = targetPosition.x - currentPos.x;
        const dy = targetPosition.y - currentPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Si on est arrivé à destination
        if (distance < 5) {
          setTargetPosition(null);
          return currentPos;
        }

        // Calculer le mouvement
        const moveDistance = MOVE_SPEED * deltaTime;
        const ratio = Math.min(moveDistance / distance, 1);

        const newX = currentPos.x + dx * ratio;
        const newY = currentPos.y + dy * ratio;

        // Limiter dans les bounds du monde
        return {
          x: Math.max(CHARACTER_SIZE, Math.min(WORLD_WIDTH - CHARACTER_SIZE, newX)),
          y: Math.max(CHARACTER_SIZE, Math.min(WORLD_HEIGHT - CHARACTER_SIZE, newY))
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

  // Dessiner sur le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Calculer l'offset de la caméra
    const offsetX = cameraLocked 
      ? position.x - CANVAS_WIDTH / 2 
      : cameraOffset.x;
    const offsetY = cameraLocked 
      ? position.y - CANVAS_HEIGHT / 2 
      : cameraOffset.y;

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sauvegarder le contexte
    ctx.save();

    // Appliquer la transformation de la caméra
    ctx.translate(-offsetX, -offsetY);

    // Dessiner le fond du monde
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Dessiner la grille de fond
    ctx.strokeStyle = '#c8e6c9';
    ctx.lineWidth = 1;
    for (let i = 0; i < WORLD_WIDTH; i += 100) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, WORLD_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i < WORLD_HEIGHT; i += 100) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(WORLD_WIDTH, i);
      ctx.stroke();
    }

    // Bordure du monde
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Dessiner la cible si elle existe
    if (targetPosition) {
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetPosition.x, targetPosition.y, 15, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(targetPosition.x - 20, targetPosition.y);
      ctx.lineTo(targetPosition.x + 20, targetPosition.y);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(targetPosition.x, targetPosition.y - 20);
      ctx.lineTo(targetPosition.x, targetPosition.y + 20);
      ctx.stroke();

      // Ligne vers la cible
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      ctx.lineTo(targetPosition.x, targetPosition.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dessiner le personnage (cercle bleu)
    ctx.fillStyle = '#2196F3';
    ctx.beginPath();
    ctx.arc(position.x, position.y, CHARACTER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Ombre du personnage
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(position.x, position.y + CHARACTER_SIZE / 2 + 5, CHARACTER_SIZE / 2, CHARACTER_SIZE / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Barre de vie
    const healthBarWidth = 40;
    const healthBarHeight = 6;
    const healthBarX = position.x - healthBarWidth / 2;
    const healthBarY = position.y - CHARACTER_SIZE - 10;

    // Fond de la barre de vie (rouge)
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    // Barre de vie actuelle (verte/orange/rouge selon HP)
    const hpPercentage = hp / maxHp;
    let healthColor;
    if (hpPercentage > 0.6) {
      healthColor = '#4CAF50';
    } else if (hpPercentage > 0.3) {
      healthColor = '#FF9800';
    } else {
      healthColor = '#f44336';
    }
    
    ctx.fillStyle = healthColor;
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * hpPercentage, healthBarHeight);

    // Bordure de la barre de vie
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

    // Texte HP
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(hp)}/${maxHp}`, position.x, healthBarY - 2);

    // Direction du personnage
    if (targetPosition) {
      const dx = targetPosition.x - position.x;
      const dy = targetPosition.y - position.y;
      const angle = Math.atan2(dy, dx);
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(
        position.x + Math.cos(angle) * 8,
        position.y + Math.sin(angle) * 8,
        4,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Dessiner les projectiles
    projectiles.forEach(proj => {
      const projWidth = proj.type.width;
      
      // Dessiner le projectile comme un rectangle arrondi orienté
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(proj.angle);

      // Ombre du projectile
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(2, 2, projWidth + 2, projWidth / 2 + 1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corps principal du projectile (ovale allongé)
      const gradient = ctx.createLinearGradient(-projWidth * 2, 0, projWidth * 2, 0);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(0.5, proj.type.color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, projWidth * 1.5, projWidth / 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bordure brillante
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Point central lumineux
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, projWidth / 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Traînée du projectile
      const trailLength = projWidth * 3;
      const trailAngle = Math.atan2(proj.vy, proj.vx);
      
      const trailGradient = ctx.createLinearGradient(
        proj.x, proj.y,
        proj.x - Math.cos(trailAngle) * trailLength,
        proj.y - Math.sin(trailAngle) * trailLength
      );
      trailGradient.addColorStop(0, proj.type.color);
      trailGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.strokeStyle = trailGradient;
      ctx.lineWidth = projWidth / 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(proj.x, proj.y);
      ctx.lineTo(
        proj.x - Math.cos(trailAngle) * trailLength,
        proj.y - Math.sin(trailAngle) * trailLength
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Restaurer le contexte
    ctx.restore();

    // Dessiner l'indicateur de camera lock (en haut à droite, pas affecté par la caméra)
    const lockIconSize = 30;
    const lockX = CANVAS_WIDTH - lockIconSize - 10;
    const lockY = 10;
    
    ctx.fillStyle = cameraLocked ? '#4CAF50' : '#9e9e9e';
    ctx.fillRect(lockX, lockY, lockIconSize, lockIconSize);
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(lockX, lockY, lockIconSize, lockIconSize);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', lockX + lockIconSize / 2, lockY + lockIconSize / 2 + 5);

  }, [position, targetPosition, hp, cameraLocked, cameraOffset, projectiles]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ marginBottom: '10px' }}>Déplacement style MOBA</h2>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Clique ou maintiens le clic pour déplacer le personnage - Espace pour lock/unlock la caméra
      </p>
      
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={toggleCameraLock}
          style={{
            padding: '10px 20px',
            backgroundColor: cameraLocked ? '#4CAF50' : '#9e9e9e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto'
          }}
        >
          🔒 Caméra: {cameraLocked ? 'VERROUILLÉE' : 'LIBRE'}
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          border: '2px solid #333',
          cursor: 'pointer',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}
      />
      
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p style={{ margin: '5px 0' }}>
          Position: X: {Math.round(position.x)}, Y: {Math.round(position.y)}
        </p>
        {targetPosition && (
          <p style={{ margin: '5px 0', color: '#4CAF50' }}>
            Cible: X: {Math.round(targetPosition.x)}, Y: {Math.round(targetPosition.y)}
          </p>
        )}
        <p style={{ 
          margin: '10px 0', 
          fontSize: '18px', 
          fontWeight: 'bold',
          color: hp > 60 ? '#4CAF50' : hp > 30 ? '#FF9800' : '#f44336'
        }}>
          HP: {Math.round(hp)} / {maxHp}
        </p>
        
        <p style={{ margin: '5px 0', color: '#FF5722', fontWeight: 'bold' }}>
          ⚡ Projectiles actifs: {projectiles.length}
        </p>
        
        <div style={{ marginTop: '15px' }}>
          <button 
            onClick={() => takeDamage(10)}
            disabled={hp <= 0}
            style={{
              margin: '0 5px',
              padding: '10px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hp <= 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: hp <= 0 ? 0.5 : 1
            }}
          >
            -10 HP
          </button>
          
          <button 
            onClick={() => takeDamage(25)}
            disabled={hp <= 0}
            style={{
              margin: '0 5px',
              padding: '10px 20px',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hp <= 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: hp <= 0 ? 0.5 : 1
            }}
          >
            -25 HP
          </button>
          
          <button 
            onClick={() => heal(20)}
            disabled={hp >= maxHp}
            style={{
              margin: '0 5px',
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hp >= maxHp ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: hp >= maxHp ? 0.5 : 1
            }}
          >
            +20 HP
          </button>
          
          <button 
            onClick={() => {
              setHp(maxHp);
              setProjectiles([]);
            }}
            disabled={hp >= maxHp}
            style={{
              margin: '0 5px',
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hp >= maxHp ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: hp >= maxHp ? 0.5 : 1
            }}
          >
            Full HP
          </button>
        </div>
        
        {hp <= 0 && (
          <p style={{ 
            marginTop: '15px', 
            color: '#f44336', 
            fontSize: '20px', 
            fontWeight: 'bold' 
          }}>
            💀 MORT
          </p>
        )}
      </div>
    </div>
  );
};

export default MobaCharacter;