const VictoryCrown = () => (
  <div className="victory-crown-wrapper">
    <div className="victory-crown">
      <div className="crown-base">
        <div className="crown-band" />
        <div className="crown-jewel-center" />
        <div className="crown-jewel-left" />
        <div className="crown-jewel-right" />
      </div>
      <div className="crown-points">
        <div className="crown-point point-left" />
        <div className="crown-point point-center" />
        <div className="crown-point point-right" />
      </div>
      <div className="crown-sparkles">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`sparkle sparkle-${i}`} />
        ))}
      </div>
    </div>
    <div className="victory-glow-ring" />
  </div>
);

export default VictoryCrown;
