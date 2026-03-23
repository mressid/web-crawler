import type { LayoutName, Mode, ThemeMode } from '../types/graph'

type ToolbarProps = {
  mode: Mode
  theme: ThemeMode
  handToolActive: boolean
  layout: LayoutName
  maxNodes: number
  focusStats: string
  status: string
  isWarn: boolean
  onModeChange: (mode: Mode) => void
  onLayoutChange: (layout: LayoutName) => void
  onMaxNodesChange: (value: number) => void
  onFileChange: (file: File) => void
  onToggleTheme: () => void
  onToggleHandTool: () => void
  onRender: () => void
  onFit: () => void
}

export function Toolbar({
  mode,
  theme,
  handToolActive,
  layout,
  maxNodes,
  focusStats,
  status,
  isWarn,
  onModeChange,
  onLayoutChange,
  onMaxNodesChange,
  onFileChange,
  onToggleTheme,
  onToggleHandTool,
  onRender,
  onFit,
}: ToolbarProps) {
  return (
    <header className="topbar">
      <h1>Crawler Graph Viewer</h1>

      <div className="control">
        <label htmlFor="jsonFile">JSON file</label>
        <input
          id="jsonFile"
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFileChange(file)
          }}
        />
      </div>

      <div className="control">
        <label htmlFor="layout">Layout</label>
        <select
          id="layout"
          value={layout}
          onChange={(event) => onLayoutChange(event.target.value as LayoutName)}
        >
          <option value="cose">cose</option>
          <option value="breadthfirst">breadthfirst</option>
          <option value="concentric">concentric</option>
          <option value="circle">circle</option>
          <option value="grid">grid</option>
        </select>
      </div>

      <div className="control">
        <label htmlFor="mode">Mode</label>
        <select id="mode" value={mode} onChange={(event) => onModeChange(event.target.value as Mode)}>
          <option value="2d">2D</option>
          <option value="3d">3D</option>
        </select>
      </div>

      <div className="control">
        <label htmlFor="maxNodes">Max nodes</label>
        <input
          id="maxNodes"
          type="number"
          min={50}
          step={50}
          value={maxNodes}
          onChange={(event) => onMaxNodesChange(Number(event.target.value) || 50)}
        />
      </div>

      <button onClick={onRender}>Render</button>
      <button className="secondary" onClick={onFit}>
        Fit
      </button>
      <button className="secondary" onClick={onToggleTheme}>
        Theme: {theme === 'dark' ? 'Dark' : 'Light'}
      </button>
      <button
        className={`secondary ${handToolActive ? 'tool-active' : ''}`}
        onClick={onToggleHandTool}
        disabled={mode !== '3d'}
        title={mode !== '3d' ? 'Switch to 3D mode to use hand tool.' : 'Pan tool'}
      >
        Hand Tool
      </button>

      <span className="hint">Expected format: {'{"graph": {"parent": ["child1", "child2"]}}'}</span>
      <span id="focusStats" style={{fontSize: 10}}>{focusStats}</span>
      <span className={isWarn ? 'status warn' : 'status'}>{status}</span>
    </header>
  )
}
