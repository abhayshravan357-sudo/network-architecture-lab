import React, { useMemo } from 'react';

/**
 * Animated device node for the network simulation
 */
export default function AnimatedDeviceNode({ 
  node, 
  isActive = false, 
  isProcessing = false, 
  isSelected = false,
  packetPosition = null,
  onClick,
}) {
  const nodeColor = node.data?.color || '#38bdf8';
  const deviceIcon = node.data?.icon || getDeviceIcon(node.data.type);
  
  const styles = useMemo(() => ({
    group: {
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.1s ease',
    },
    glow: {
      animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
      opacity: isProcessing ? 0.8 : 0.4,
    },
    deviceShape: {
      fill: `rgba(${hexToRgb(nodeColor)}, 0.15)`,
      stroke: nodeColor,
      strokeWidth: isSelected ? 3 : (isActive ? 3 : 2),
      transition: 'stroke-width 0.2s ease, stroke 0.2s ease',
    },
    icon: {
      fontSize: 20,
      fill: nodeColor,
      fontFamily: 'monospace',
    },
    label: {
      fontSize: 9,
      fill: 'var(--c-text-dim)',
      fontFamily: 'monospace',
    },
    processingIndicator: {
      animation: isProcessing ? 'spin 1s linear infinite' : 'none',
    },
    processingText: {
      fill: '#38bdf8',
      fontWeight: 'bold',
      fontSize: 8,
    },
    packet: {
      animation: 'pulse 0.5s ease-in-out infinite',
    },
    deviceIconText: {
      fontSize: 20,
      fill: nodeColor,
      fontFamily: 'monospace',
    },
  }, [isActive, isProcessing, isSelected, nodeColor]);
  
  return (
    <g 
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onClick={() => onClick?.(node.id)}
      style={styles.group}
    >
      {/* Glow effect when active */}
      {isActive && (
        <circle 
          r="28" 
          fill="none" 
          stroke="#38bdf8" 
          strokeWidth="2"
          strokeDasharray="8,4"
          style={styles.glow}
        />
      )}
      
      {/* Device shape */}
      <rect
        x="-24"
        y="-20"
        width="48"
        height="40"
        rx="8"
        style={styles.deviceShape}
      />
      
      {/* Device icon */}
      <text 
        x="0" 
        y="6" 
        textAnchor="middle" 
        style={styles.deviceIconText}
      >
        {deviceIcon}
      </text>
      
      {/* Device label */}
      <text 
        x="0" 
        y="30" 
        textAnchor="middle" 
        style={styles.label}
      >
        {node.data?.label || node.id}
      </text>
      
      {/* Processing indicator */}
      {isProcessing && (
        <g style={styles.processingIndicator}>
          <circle 
            cx="0" 
            cy="-32" 
            r="10" 
            fill="none" 
            stroke="#38bdf8" 
            strokeWidth="2"
            strokeDasharray="20,10"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <text 
            x="0" 
            y="-28" 
            textAnchor="middle" 
            style={styles.processingText}
          >
            PROCESSING
          </text>
        </g>
      )}
      
      {/* Packet at this node */}
      {packetPosition && (
        <circle
          cx={0}
          cy={0}
          r="6"
          fill="#38bdf8"
          stroke="#fff"
          strokeWidth="1"
          style={styles.packet}
        />
      )}
    </g>
  );
}

/**
 * Get device icon based on type
 */
function getDeviceIcon(type) {
  const icons = {
    router: '⬢',
    l2Switch: '⬡',
    l3Switch: '⬢',
    firewall: '🛡',
    server: '🖥',
    pc: '💻',
    laptop: '💻',
    accessPoint: '📶',
    wirelessController: '📡',
    cloud: '☁',
  };
  return icons[type] || '⬟';
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '56, 189, 248'; // Default cyan
}

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.1); }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes packetMove {
      from { offset-distance: 0%; }
      to { offset-distance: 100%; }
    }
    
    .simulation-toolbar button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .animated-packet {
      animation: packetMove 2s linear infinite;
    }
  `;
  document.head.appendChild(style);
}

export default AnimatedDeviceNode;