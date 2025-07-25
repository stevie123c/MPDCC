import React, { useEffect, useState, useRef } from "react";
import "./App.css";

const FIDELITY_GREEN = "#00743A";

interface Answer {
  zone: string;
  text: string;
  isCorrect: boolean;
}
interface Question {
  round: number;
  question: string;
  answers: Answer[];
}

// 1. Add multi-team support data structures
interface TeamState {
  name: string;
  score: number;
  allocations: { [zone: string]: number };
  revealedZones: string[];
  revealDone: boolean;
  revealStep: number;
  showLockWarning: boolean;
  // Add more per-team state as needed
}

const App: React.FC = () => {
  // All hooks at the top
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(1000000);
  const [scorePop, setScorePop] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);
  const [timer, setTimer] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerLocked, setTimerLocked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [allocations, setAllocations] = useState<{ [zone: string]: number }>({});
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [revealedZones, setRevealedZones] = useState<string[]>([]);
  const [revealInProgress, setRevealInProgress] = useState(false);
  const [revealDone, setRevealDone] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [multiTeamMode, setMultiTeamMode] = useState(false);
  const [numTeams, setNumTeams] = useState(2);
  const [teamNames, setTeamNames] = useState<string[]>(["Team 1", "Team 2"]);
  const [teams, setTeams] = useState<TeamState[]>([]);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);

  useEffect(() => {
    fetch("/data/questions.json")
      .then((res) => res.json())
      .then((data) => setQuestions(data));
  }, []);

  useEffect(() => {
    if (timerRunning && timer > 0) {
      timerRef.current = setTimeout(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0 && timerRunning) {
      setTimerRunning(false);
      // Only lock in if rule is satisfied
      if (Object.values(allocations).some(v => v === 0) && totalAllocated === score) {
        setTimerLocked(true);
        setShowLockWarning(false);
      } else {
        setShowLockWarning(true);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerRunning, timer]);

  const currentQuestion = questions.find((q) => q.round === currentRound);

  useEffect(() => {
    // Reset allocations when question changes
    if (currentQuestion) {
      const newAlloc: { [zone: string]: number } = {};
      currentQuestion.answers.forEach(ans => { newAlloc[ans.zone] = 0; });
      setAllocations(newAlloc);
    }
  }, [currentQuestion]);

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const available = score - totalAllocated;

  // Reveal logic: step through wrong answers, then highlight right answer
  const wrongZones = currentQuestion?.answers.filter(a => !a.isCorrect).map(a => a.zone) || [];
  const correctZone = currentQuestion?.answers.find(a => a.isCorrect)?.zone;
  const revealOrder = wrongZones;
  const totalReveals = (currentQuestion?.answers.length || 0) - 1;

  // Sound effect hooks
  // Remove playSound function and all calls to playSound

  const handleReveal = () => {
    if (!timerLocked || revealInProgress || revealDone) return;
    if (revealStep < revealOrder.length) {
      const zone = revealOrder[revealStep];
      setRevealedZones(prev => [...prev, zone]);
      setRevealStep(s => s + 1);
      // Subtract points from score in real time if there were points on this wrong answer
      if (allocations[zone] > 0) {
        setScore(prev => prev - allocations[zone]);
      }
      // If this is the last wrong answer, next click will highlight correct
      if (revealStep === revealOrder.length - 1) {
        setRevealDone(true);
        setTimeout(() => {
          setScore(allocations[correctZone!] || 0);
        }, 1000);
      }
    } else if (revealStep === revealOrder.length) {
      // Final reveal: highlight correct answer only
      setRevealStep(s => s + 1);
      setRevealDone(true);
      setTimeout(() => {
        setScore(allocations[correctZone!] || 0);
      }, 1000);
    }
  };

  // Reset reveal state on new question
  useEffect(() => {
    setRevealedZones([]);
    setRevealInProgress(false);
    setRevealDone(false);
    setRevealStep(0);
  }, [currentQuestion]);

  // Start timer automatically when user adds money to any zone
  const adjustAllocation = (zone: string, amount: number) => {
    if (timerLocked) return;
    if (amount > 0 && available < amount) return;
    if (amount < 0 && allocations[zone] + amount < 0) return;
    setAllocations(prev => ({ ...prev, [zone]: prev[zone] + amount }));
    if (!timerRunning && !timerLocked && amount > 0) {
      setTimerRunning(true);
      setTimerLocked(false);
    }
  };

  const handleAllIn = (zone: string) => {
    if (timerLocked) return;
    const newAlloc: { [zone: string]: number } = {};
    Object.keys(allocations).forEach(z => {
      newAlloc[z] = z === zone ? score : 0;
    });
    setAllocations(newAlloc);
    if (!timerRunning && !timerLocked) {
      setTimerRunning(true);
      setTimerLocked(false);
    }
  };

  const goToPrevious = () => {
    setCurrentRound((r) => Math.max(1, r - 1));
    setTimer(60);
    setTimerRunning(false);
    setTimerLocked(false);
  };
  const goToNext = () => {
    setCurrentRound((r) => Math.min(10, r + 1));
    setTimer(60);
    setTimerRunning(false);
    setTimerLocked(false);
  };

  const canLockIn = Object.values(allocations).some(v => v === 0) && totalAllocated === score && !timerLocked;

  const handleLockIn = () => {
    if (!Object.values(allocations).some(v => v === 0)) {
      setShowLockWarning(true);
      return;
    }
    if (totalAllocated !== score) {
      setShowLockWarning(true);
      return;
    }
    setTimerLocked(true);
    setTimerRunning(false); // Stop timer if running
    setShowLockWarning(false);
  };

  // Prevent allocating to all zones: if only one empty zone left, block adding to it
  const canAllocateToZone = (zone: string) => {
    if (timerLocked) return false;
    const emptyZones = Object.entries(allocations).filter(([_, v]) => v === 0).map(([z]) => z);
    if (emptyZones.length === 1 && emptyZones[0] === zone) return false;
    return true;
  };

  const isNextEnabled = timerLocked && revealDone;
  const isGameEnd = currentRound === 10 && isNextEnabled;

  // Animate score pop on change
  useEffect(() => {
    if (scorePop) return;
    setScorePop(true);
    const timeout = setTimeout(() => setScorePop(false), 400);
    return () => clearTimeout(timeout);
  }, [score]);

  // Confetti effect when correct answer is revealed
  useEffect(() => {
    if (revealDone && revealStep >= totalReveals) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1200);
    }
  }, [revealDone, revealStep, totalReveals]);

  // End page logic
  if (isGameEnd) {
    return (
      <div style={{ background: FIDELITY_GREEN, minHeight: "100vh", color: "white", fontFamily: 'Segoe UI, Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: 2, marginBottom: 32 }}>Game Over</h1>
        {score > 0 ? (
          <div style={{ fontSize: "2rem", fontWeight: 600, marginBottom: 24 }}>Congratulations! You finished with <span style={{ color: '#FFD700' }}>{score.toLocaleString()}P</span>!</div>
        ) : (
          <div style={{ fontSize: "2rem", fontWeight: 600, marginBottom: 24 }}>Unlucky! You didn't win any points.</div>
        )}
        <button style={{ background: "#fff", color: FIDELITY_GREEN, fontWeight: 700, fontSize: "1.1rem", border: "none", borderRadius: 8, padding: "0.7rem 2rem", marginTop: 24, cursor: "pointer" }} onClick={() => window.location.reload()}>Restart Game</button>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div style={{ background: FIDELITY_GREEN, minHeight: "100vh", color: "white", fontFamily: 'Segoe UI, Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: 2, marginBottom: 24 }}>Welcome to Million Points Drop!</h1>
        <div style={{ maxWidth: 600, fontSize: "1.2rem", marginBottom: 32, background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 24, lineHeight: 1.6 }}>
          <strong>How to Play:</strong>
          <ul style={{ textAlign: 'left', margin: '16px 0 0 24px', padding: 0 }}>
            <li>Start with <b>1,000,000P</b> (points).</li>
            <li>For each question, split your points across answer zones in increments of <b>25,000P</b> or <b>100,000P</b>.</li>
            <li><b>At least one zone must be left empty</b> each round.</li>
            <li>The timer starts when you add points to any zone. Lock in your allocations before the timer runs out, or it will lock automatically.</li>
            <li>Reveal wrong answers one by one—points on those zones are lost!</li>
            <li>Only points on the correct answer survive to the next round.</li>
            <li>Play through 10 rounds and see how many points your team can keep!</li>
          </ul>
          <div style={{ marginTop: 16 }}><b>Tip:</b> Use the <b>All In</b> button for quick allocation!</div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ marginRight: 16 }}>
            <input type="radio" checked={!multiTeamMode} onChange={() => setMultiTeamMode(false)} /> Single Team
          </label>
          <label>
            <input type="radio" checked={multiTeamMode} onChange={() => setMultiTeamMode(true)} /> Multiple Teams
          </label>
        </div>
        {multiTeamMode && (
          <div style={{ marginBottom: 24 }}>
            <label>
              Number of Teams: 
              <input type="number" min={2} max={6} value={numTeams} onChange={e => {
                const n = Math.max(2, Math.min(6, Number(e.target.value)));
                setNumTeams(n);
                setTeamNames(prev => Array.from({ length: n }, (_, i) => prev[i] || `Team ${i + 1}`));
              }} style={{ width: 60, marginLeft: 8 }} />
            </label>
            <div style={{ marginTop: 12 }}>
              {Array.from({ length: numTeams }).map((_, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <label>
                    Team {i + 1} Name: 
                    <input type="text" value={teamNames[i] || ""} onChange={e => {
                      const newNames = [...teamNames];
                      newNames[i] = e.target.value;
                      setTeamNames(newNames);
                    }} style={{ marginLeft: 8 }} />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => {
          if (multiTeamMode) {
            setTeams(Array.from({ length: numTeams }, (_, i) => ({
              name: teamNames[i] || `Team ${i + 1}`,
              score: 1000000,
              allocations: {},
              revealedZones: [],
              revealDone: false,
              revealStep: 0,
              showLockWarning: false,
            })));
            setCurrentTeamIndex(0);
          } else {
            setTeams([{
              name: "Team",
              score: 1000000,
              allocations: {},
              revealedZones: [],
              revealDone: false,
              revealStep: 0,
              showLockWarning: false,
            }]);
            setCurrentTeamIndex(0);
          }
          setGameStarted(true);
        }} style={{ background: "#FFD700", color: FIDELITY_GREEN, fontWeight: 700, fontSize: "1.3rem", border: "none", borderRadius: 10, padding: "1rem 3rem", cursor: "pointer", boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>Start Game</button>
      </div>
    );
  }

  // Add a visually hidden class for screen readers
  const visuallyHidden = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    border: 0,
  };

  const renderConfetti = () => {
    if (!showConfetti) return null;
    const colors = ["#FFD700", "#fff", "#00743A", "#ff4444", "#00bfff"];
    return (
      <div className="confetti" ref={confettiRef}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 90 - 45}vw`,
              background: colors[i % colors.length],
              animationDelay: `${Math.random() * 0.3}s`,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ background: FIDELITY_GREEN, minHeight: "100vh", color: "white", fontFamily: 'Segoe UI, Arial, sans-serif' }}>
      <header style={{ padding: "2rem 0 1rem 0", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: 2 }}>WI Culture Crew: Million Points Drop</h1>
      </header>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2rem" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          <span className={scorePop ? "score-pop" : ""}>{score.toLocaleString()}P</span>
        </div>
        <div style={{ fontSize: "2rem", fontWeight: 700, background: timerLocked ? "#ccc" : timerRunning ? "#fff" : "#fff", color: timerLocked ? "#888" : FIDELITY_GREEN, borderRadius: 12, padding: "0.5rem 2rem", border: timerLocked ? "2px solid #888" : timerRunning ? `2px solid ${FIDELITY_GREEN}` : `2px solid ${FIDELITY_GREEN}` }}>
          {timerLocked ? "Locked" : `${timer}s`}
        </div>
      </div>
      <main style={{ margin: "2rem auto", maxWidth: 900, background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "2rem" }}>
        {currentQuestion ? (
          <>
            <div style={{ fontSize: "1.7rem", fontWeight: 500, marginBottom: "2rem", textAlign: "center" }}>{currentQuestion.question}</div>
            <div style={{ display: "flex", justifyContent: "space-around", margin: "2rem 0" }}>
              {currentQuestion.answers.map((ans) => (
                <div key={ans.zone} style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: 8 }}>Zone {ans.zone}</div>
                  <div style={{ background: "#fff", color: FIDELITY_GREEN, borderRadius: 10, padding: "1.2rem 1.5rem", minWidth: 120, minHeight: 60, fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>{ans.text}</div>
                  {/* Poker chip stack placeholder */}
                  <div style={{ marginTop: 18 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", border: `4px solid ${FIDELITY_GREEN}`, margin: "0 auto", boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}></div>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", border: `4px solid ${FIDELITY_GREEN}`, margin: "-10px auto 0 auto", boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}></div>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", border: `4px solid ${FIDELITY_GREEN}`, margin: "-10px auto 0 auto", boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}></div>
                  </div>
                  {/* Money allocation controls */}
                  <div style={{ marginTop: 12 }}>
                    <div className={revealedZones.includes(ans.zone) ? 'zone-eliminated' : (revealDone && ans.isCorrect && revealStep >= totalReveals ? 'zone-correct' : '')} style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: 4, opacity: revealedZones.includes(ans.zone) ? 0.4 : (revealDone && ans.isCorrect && revealStep >= totalReveals ? 1 : 1), textDecoration: revealedZones.includes(ans.zone) ? 'line-through' : (revealDone && ans.isCorrect && revealStep >= totalReveals ? 'underline' : 'none'), color: revealDone && ans.isCorrect && revealStep >= totalReveals ? '#FFD700' : undefined }} aria-live="polite" aria-label={`Zone ${ans.zone} allocation: ${allocations[ans.zone] || 0} points`}>{allocations[ans.zone]?.toLocaleString() || 0}P</div>
                    <button className="button" aria-label={`Add 25,000 points to zone ${ans.zone}`} onClick={() => adjustAllocation(ans.zone, 25000)} disabled={!canAllocateToZone(ans.zone) || available < 25000} style={{ margin: 2, padding: "0.3rem 0.7rem", fontWeight: 700, borderRadius: 6, border: "none", background: available < 25000 || !canAllocateToZone(ans.zone) ? "#eee" : FIDELITY_GREEN, color: available < 25000 || !canAllocateToZone(ans.zone) ? "#888" : "#fff", cursor: available < 25000 || !canAllocateToZone(ans.zone) ? "not-allowed" : "pointer" }}>+25k<span style={visuallyHidden}> to zone {ans.zone}</span></button>
                    <button className="button" aria-label={`Add 100,000 points to zone ${ans.zone}`} onClick={() => adjustAllocation(ans.zone, 100000)} disabled={!canAllocateToZone(ans.zone) || available < 100000} style={{ margin: 2, padding: "0.3rem 0.7rem", fontWeight: 700, borderRadius: 6, border: "none", background: available < 100000 || !canAllocateToZone(ans.zone) ? "#eee" : FIDELITY_GREEN, color: available < 100000 || !canAllocateToZone(ans.zone) ? "#888" : "#fff", cursor: available < 100000 || !canAllocateToZone(ans.zone) ? "not-allowed" : "pointer" }}>+100k<span style={visuallyHidden}> to zone {ans.zone}</span></button>
                    <button className="button" aria-label={`Remove 25,000 points from zone ${ans.zone}`} onClick={() => adjustAllocation(ans.zone, -25000)} disabled={timerLocked || allocations[ans.zone] < 25000} style={{ margin: 2, padding: "0.3rem 0.7rem", fontWeight: 700, borderRadius: 6, border: "none", background: allocations[ans.zone] < 25000 || timerLocked ? "#eee" : FIDELITY_GREEN, color: allocations[ans.zone] < 25000 || timerLocked ? "#888" : "#fff", cursor: allocations[ans.zone] < 25000 || timerLocked ? "not-allowed" : "pointer" }}>-25k<span style={visuallyHidden}> from zone {ans.zone}</span></button>
                    <button className="button" aria-label={`Remove 100,000 points from zone ${ans.zone}`} onClick={() => adjustAllocation(ans.zone, -100000)} disabled={timerLocked || allocations[ans.zone] < 100000} style={{ margin: 2, padding: "0.3rem 0.7rem", fontWeight: 700, borderRadius: 6, border: "none", background: allocations[ans.zone] < 100000 || timerLocked ? "#eee" : FIDELITY_GREEN, color: allocations[ans.zone] < 100000 || timerLocked ? "#888" : "#fff", cursor: allocations[ans.zone] < 100000 || timerLocked ? "not-allowed" : "pointer" }}>-100k<span style={visuallyHidden}> from zone {ans.zone}</span></button>
                    <button className="button" aria-label={`All in on zone ${ans.zone}`} onClick={() => handleAllIn(ans.zone)} disabled={timerLocked || allocations[ans.zone] === score} style={{ margin: 2, padding: "0.3rem 0.7rem", fontWeight: 700, borderRadius: 6, border: "none", background: timerLocked || allocations[ans.zone] === score ? "#eee" : "#FFD700", color: timerLocked || allocations[ans.zone] === score ? "#888" : FIDELITY_GREEN, cursor: timerLocked || allocations[ans.zone] === score ? "not-allowed" : "pointer" }}>All In<span style={visuallyHidden}> on zone {ans.zone}</span></button>
                  </div>
                </div>
              ))}
            </div>
            {/* Host controls restored */}
            <div style={{ marginTop: 40, textAlign: "center" }}>
              <button className="button" aria-label="Lock in allocations" onClick={handleLockIn} disabled={!canLockIn}>Lock In</button>
              <button className="button" aria-label="Reveal answers" onClick={handleReveal} disabled={revealDone || !timerLocked || revealStep > totalReveals}>Reveal</button>
              <button className="button" aria-label="Go to previous question" onClick={goToPrevious} disabled={currentRound === 1}>Previous</button>
              <button className="button" aria-label="Go to next question" onClick={goToNext} disabled={!isNextEnabled || currentRound === 10}>Next</button>
            </div>
            {showLockWarning && (
              <div style={{ color: "#ff4444", fontWeight: 700, marginTop: 12 }}>
                You must allocate all money and leave at least one zone empty before locking in!
              </div>
            )}
            <div style={{ textAlign: "center", fontWeight: 600, margin: "1rem 0" }}>Total Allocated: {totalAllocated.toLocaleString()}P / {score.toLocaleString()}P | Available: {available.toLocaleString()}P</div>
          </>
        ) : (
          <div style={{ textAlign: "center", fontSize: 24, marginTop: 40 }}>Loading...</div>
        )}
      </main>
      {renderConfetti()}
    </div>
  );
};

export default App;
