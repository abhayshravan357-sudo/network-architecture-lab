import { useEffect, useState } from 'react';

// Drives packet animation timing in the UI. The engine stays synchronous and
// deterministic; this hook walks the engine-provided steps at ~400ms per hop.
export function usePacketAnimation({ steps, devices, tick, hopMs = 400 }) {
  const [hopIndex, setHopIndex] = useState(-1);

  useEffect(() => {
    if (!steps || steps.length === 0) {
      setHopIndex(-1);
      return;
    }
    setHopIndex(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        clearInterval(timer);
        setHopIndex(steps.length - 1);
      } else {
        setHopIndex(i);
      }
    }, hopMs);
    return () => clearInterval(timer);
  }, [tick, steps, hopMs]);

  if (!steps || steps.length === 0 || hopIndex < 0) {
    return { active: false, position: null, currentStep: null, hopIndex: -1, totalHops: 0 };
  }

  const step = steps[hopIndex];
  const device = devices.find((d) => d.id === step.device);
  return {
    active: true,
    position: device ? { x: device.x, y: device.y } : null,
    currentStep: step,
    hopIndex,
    totalHops: steps.length,
  };
}

export function PacketHopIndicator({ animation }) {
  if (!animation.active || !animation.currentStep) return null;
  const { currentStep, hopIndex, totalHops } = animation;
  return (
    <div className="packet-hop-indicator">
      <span className={`packet-badge ${currentStep.packetType}`}>
        {currentStep.packetType}
      </span>
      <span>
        hop {hopIndex + 1}/{totalHops} — {currentStep.action}
      </span>
    </div>
  );
}
