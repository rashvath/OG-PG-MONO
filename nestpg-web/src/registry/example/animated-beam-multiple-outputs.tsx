type AnimatedBeamMultipleOutputDemoProps = {
  className?: string
}

export default function AnimatedBeamMultipleOutputDemo({ className }: AnimatedBeamMultipleOutputDemoProps) {
  return (
    <div className={`mini-beam-demo ${className ?? ''}`.trim()}>
      <div className="beam-node center">Core</div>
      <div className="beam-node one">API</div>
      <div className="beam-node two">DB</div>
      <div className="beam-node three">Web</div>
      <span className="beam-line line-one" />
      <span className="beam-line line-two" />
      <span className="beam-line line-three" />
    </div>
  )
}
