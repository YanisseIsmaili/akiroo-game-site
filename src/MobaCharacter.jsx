import React, { useState, useEffect, useRef } from 'react';

const MobaCharacter = () => {
  const [position, setPosition] = useState({ x: 400, y: 300 });
  const [targetPosition, setTargetPosition] = useState(null);
  const [hp, setHp] = useState(100);
  const [maxHp] = useState(100);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [cameraLocked, setCameraLocked] = useState(true);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const MOVE_SPEED = 200; // pixels par seconde
  const CHARACTER_SIZE = 30;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const WORLD_WIDTH = 2000;
  const WORLD_HEIGHT = 1500;

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

  }, [position, targetPosition, hp, cameraLocked, cameraOffset]);

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
            onClick={() => setHp(maxHp)}
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
