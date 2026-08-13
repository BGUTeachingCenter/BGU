const canvas = document.getElementById('rescueCanvas');
const ctx = canvas.getContext('2d');

// --- HTML Elements ---
const setupDiv = document.getElementById('setup');
const gameAreaDiv = document.getElementById('gameArea');
const startGameButton = document.getElementById('startGameButton');
const roundsSelect = document.getElementById('rounds');
const statusText = document.getElementById('statusText');
const roundInfoText = document.getElementById('roundInfo');
const sandSpeedSlider = document.getElementById('sandSpeed');
const waterSpeedSlider = document.getElementById('waterSpeed');
const sandSpeedValue = document.getElementById('sandSpeedValue');
const waterSpeedValue = document.getElementById('waterSpeedValue');
const nextRoundButton = document.getElementById('nextRoundButton');
const newGameButton = document.getElementById('newGameButton');
// Player 1 Results
const p1TimeDisplay = document.getElementById('p1Time');
const p1ScoreDisplay = document.getElementById('p1Score');
const p1Face = document.getElementById('p1Face');
// Player 2 Results
const p2TimeDisplay = document.getElementById('p2Time');
const p2ScoreDisplay = document.getElementById('p2Score');
const p2Face = document.getElementById('p2Face');
// General Results
const optimalTimeDisplay = document.getElementById('optimalTime');
const roundWinnerDisplay = document.getElementById('roundWinner');
// Final Results
const finalResultDiv = document.getElementById('finalResult');
const p1WinsDisplay = document.getElementById('p1Wins');
const p2WinsDisplay = document.getElementById('p2Wins');
const gameWinnerDisplay = document.getElementById('gameWinner');


// --- Constants ---
const BEACH_COLOR = "#F4A460"; // SandyBrown
const WATER_COLOR = "#4682B4"; // SteelBlue
const TOWER_COLOR = "#8B4513"; // SaddleBrown
const PATH_COLOR_P1 = "red";
const PATH_COLOR_P2 = "blue";
const PATH_COLOR_OPTIMAL = "green";
const PERSON_COLOR = "#FF6347"; // Tomato
const LIFEGUARD_COLOR_P1 = "#DC143C"; // Crimson Red
const LIFEGUARD_COLOR_P2 = "#0000FF"; // Blue
const LIFEGUARD_COLOR_OPTIMAL = "rgba(0, 128, 0, 0.6)"; // Semi-transparent Green

const WATER_LINE_Y = canvas.height * 0.5;
const TOWER_WIDTH = 30;
const TOWER_HEIGHT = 50;
const TOWER_X = canvas. width / 2 - TOWER_WIDTH / 2;
const TOWER_Y = WATER_LINE_Y * 0.15;
// Starting positions for two lifeguards
const LIFEGUARD_START_Y = TOWER_Y + TOWER_HEIGHT +5; 
const LIFEGUARD1_START_X = TOWER_X + TOWER_WIDTH / 2 - 15; // Slightly left
const LIFEGUARD2_START_X = TOWER_X + TOWER_WIDTH / 2 + 15; // Slightly right
const OPTIMAL_LIFEGUARD_START_X = TOWER_X + TOWER_WIDTH / 2; // Center for calc

const DISTANCE_SCALE_FACTOR = 10.0; // <<< שינוי 1: קנה מידה למרחק/זמן

// --- Game State Variables ---
let vSand = parseFloat(sandSpeedSlider.value);
let vWater = parseFloat(waterSpeedSlider.value);
let drowningPerson = null;
let optimalTime = null;
let optimalEntryX = null;
let animationFrameId = null;
let waveOffset = 0;
let drowningOffsetY = 0;

let gameState = "SETUP"; // SETUP, PLACE_DROWNER, P1_CHOOSE, P2_CHOOSE, ANIMATING, ROUND_OVER, GAME_OVER
let totalRounds = 3;
let currentRound = 0;
let player1EntryX = null;
let player1Time = null;
let player1Score = null;
let player2EntryX = null;
let player2Time = null;
let player2Score = null;
let player1Wins = 0;
let player2Wins = 0;

// Animation State
let animationStartTime = null; // Time when animation began
let lifeguard1Pos = { x: LIFEGUARD1_START_X, y: LIFEGUARD_START_Y };
let lifeguard2Pos = { x: LIFEGUARD2_START_X, y: LIFEGUARD_START_Y };
let optimalLifeguardPos = { x: OPTIMAL_LIFEGUARD_START_X, y: LIFEGUARD_START_Y };
let animationDuration = 0; // Max time to run animation

// --- Drawing Functions ---

function drawBackground() {
    // Draw sand
    ctx.fillStyle = BEACH_COLOR;
    ctx.fillRect(0, 0, canvas.width, WATER_LINE_Y);

    // Draw water
    ctx.fillStyle = WATER_COLOR;
    ctx.fillRect(0, WATER_LINE_Y, canvas.width, canvas.height - WATER_LINE_Y);
}

function drawWaves() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; // White transparent lines
    ctx.lineWidth = 2;
    const amplitude = 5;
    const frequency = 0.02;
    const speed = 0.05;

    for (let y = WATER_LINE_Y + 20; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < canvas.width; x++) {
            const waveY = y + amplitude * Math.sin(x * frequency + waveOffset);
            ctx.lineTo(x, waveY);
        }
        ctx.stroke();
    }
    // Animate waves only if the loop is running (game started or results shown)
    if (gameState !== "SETUP") {
       waveOffset += speed;
    }
}

function drawTower() {
    ctx.fillStyle = TOWER_COLOR;
    ctx.fillRect(TOWER_X, TOWER_Y, TOWER_WIDTH, TOWER_HEIGHT);
    // Simple roof
    ctx.beginPath();
    ctx.moveTo(TOWER_X - 5, TOWER_Y);
    ctx.lineTo(TOWER_X + TOWER_WIDTH + 5, TOWER_Y);
    ctx.lineTo(TOWER_X + TOWER_WIDTH / 2, TOWER_Y - 15);
    ctx.closePath();
    ctx.fillStyle = '#A0522D'; // Sienna
    ctx.fill();
}

function drawDrowningPerson(person) {
    if (!person) return;
    const bobbingAmplitude = 3;
    // Bobbing should happen if waves are moving
     if (gameState !== "SETUP") {
        drowningOffsetY = bobbingAmplitude * Math.sin(waveOffset + person.x * 0.05);
     } else {
         drowningOffsetY = 0; // No bobbing before game starts
     }

    const drawY = person.y + drowningOffsetY;

    // Head
    ctx.fillStyle = PERSON_COLOR;
    ctx.beginPath();
    ctx.arc(person.x, drawY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Arms (waving simple indication)
    ctx.strokeStyle = PERSON_COLOR;
    ctx.lineWidth = 2;
    const armWave = gameState !== "SETUP" ? bobbingAmplitude * Math.sin(waveOffset * 1.5) : 0;
    ctx.beginPath();
    ctx.moveTo(person.x - 7, drawY);
    ctx.lineTo(person.x - 15, drawY - 10 + armWave); // Waving arm 1
    ctx.moveTo(person.x + 7, drawY);
    ctx.lineTo(person.x + 15, drawY - 10 - armWave); // Waving arm 2
    ctx.stroke();
}

function drawLifeguard(x, y, color) {
    const isAnimating = gameState === "ANIMATING";
    const onSand = y < WATER_LINE_Y;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    // Head
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const bodyY_start = y + 8;
    const bodyY_end = y + 20;
    ctx.beginPath();
    ctx.moveTo(x, bodyY_start);
    ctx.lineTo(x, bodyY_end);
    ctx.stroke();

    // Basic running/swimming pose indication (only during animation)
    let legAngle = 0;
    let armAngle = 0;
    if (isAnimating) {
       const timeFactor = performance.now() * 0.008; // Slower animation
       legAngle = onSand ? Math.sin(timeFactor) * 0.5 : Math.sin(timeFactor * 0.7) * 0.3; // Running/Kicking legs swing
       armAngle = onSand ? Math.cos(timeFactor) * 0.4 : Math.sin(timeFactor) * 0.6; // Running/Swimming arms swing
    }

    // Legs (simple lines) - from bottom of body
    const legLength = 12;
    ctx.beginPath();
    ctx.moveTo(x, bodyY_end); // Start from bottom of torso
    ctx.lineTo(x + legLength * Math.sin(legAngle), bodyY_end + legLength * Math.cos(legAngle));
    ctx.moveTo(x, bodyY_end);
    ctx.lineTo(x + legLength * Math.sin(-legAngle), bodyY_end + legLength * Math.cos(-legAngle));
    ctx.stroke();

     // Arms (simple lines) - from middle of body
     const armLength = 10;
     const armPivotY = bodyY_start + (bodyY_end - bodyY_start) / 3; // Pivot point for arms
    ctx.beginPath();
    ctx.moveTo(x, armPivotY);
    ctx.lineTo(x + armLength * Math.cos(Math.PI/2 + armAngle), armPivotY + armLength * Math.sin(Math.PI/2 + armAngle));
    ctx.moveTo(x, armPivotY);
    ctx.lineTo(x + armLength * Math.cos(Math.PI/2 - armAngle), armPivotY + armLength * Math.sin(Math.PI/2 - armAngle));
    ctx.stroke();
}

function drawPath(startX, startY, entryX, entryY, endX, endY, color, lineWidth, dashed = true) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(entryX, entryY);
    ctx.lineTo(endX, endY);
    if (dashed) {
        ctx.setLineDash([5, 3]); // Make paths dashed
    } else {
        ctx.setLineDash([]); // Solid line
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash pattern

    // Mark entry point clearly
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(entryX, entryY, 5, 0, Math.PI * 2); // Slightly larger circle marker
    ctx.fill();
    // White inner dot for visibility
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(entryX, entryY, 2, 0, Math.PI * 2);
    ctx.fill();
}


// --- Calculation Functions ---
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function calculateTime(distSand, distWater, speedSand, speedWater) {
    if (speedSand <= 0 || speedWater <= 0) return Infinity; // Avoid division by zero
    // <<< שינוי 1: שימוש בקנה מידה לחישוב הזמן >>>
    const scaledDistSand = distSand / DISTANCE_SCALE_FACTOR;
    const scaledDistWater = distWater / DISTANCE_SCALE_FACTOR;
    return (scaledDistSand / speedSand) + (scaledDistWater / speedWater);
}

function findOptimalPath(startX, startY, endX, endY, waterY, speedSand, speedWater) {
    // Handle edge case where start or end is exactly on the line or speeds are invalid
    if (speedSand <= 0 || speedWater <= 0) {
         console.warn("Speeds must be positive. Cannot calculate optimal path.");
         return { optimalEntryX: startX, optimalTime: Infinity };
    }
     // If start and end X are the same, optimal path is straight down
    if (Math.abs(startX - endX) < 0.1) {
         const distSand = Math.abs(waterY - startY);
         const distWater = calculateDistance(startX, waterY, endX, endY);
         return { optimalEntryX: startX, optimalTime: calculateTime(distSand, distWater, speedSand, speedWater) }; // calculateTime now uses scaling
    }

    let minTime = Infinity;
    let bestEntryX = startX;

    // Numerical search
    const searchStartX = 0;
    const searchEndX = canvas.width;
    const step = 1;

    for (let currentEntryX = searchStartX; currentEntryX <= searchEndX; currentEntryX += step) {
        const distSand = calculateDistance(startX, startY, currentEntryX, waterY);
        const distWater = calculateDistance(currentEntryX, waterY, endX, endY);
        const time = calculateTime(distSand, distWater, speedSand, speedWater); // Uses scaling

        if (time < minTime) {
            minTime = time;
            bestEntryX = currentEntryX;
        }
    }

     // Refine around the best X found
     const refineStep = 0.1;
     for (let currentEntryX = bestEntryX - step; currentEntryX <= bestEntryX + step; currentEntryX += refineStep) {
          if (currentEntryX < searchStartX || currentEntryX > searchEndX) continue;

          const distSand = calculateDistance(startX, startY, currentEntryX, waterY);
          const distWater = calculateDistance(currentEntryX, waterY, endX, endY);
          const time = calculateTime(distSand, distWater, speedSand, speedWater); // Uses scaling

          if (time < minTime) {
              minTime = time;
              bestEntryX = currentEntryX;
          }
     }

    return { optimalEntryX: bestEntryX, optimalTime: minTime };
}

function calculateScore(userT, optimalT) {
    if (userT === null || optimalT === null || optimalT <= 0 || userT === Infinity) return 0;
    const ratio = userT / optimalT;
    if (ratio <= 1.01) return 100;
    if (ratio >= 2.5) return 0;
    return Math.round(100 * (2.5 - ratio) / (2.5 - 1.01));
}


// --- Game Logic and State Management ---

function startGame() {
    console.log("startGame called");
    totalRounds = parseInt(roundsSelect.value);
    player1Wins = 0;
    player2Wins = 0;
    currentRound = 0;
    setupDiv.style.display = 'none';
    gameAreaDiv.style.display = 'flex';
    finalResultDiv.style.display = 'none';
    newGameButton.style.display = 'none';
    nextRoundButton.style.display = 'none';

    if (!animationFrameId) {
        console.log("Requesting animation frame from startGame");
        animationFrameId = requestAnimationFrame(mainLoop);
    } else {
        console.log("Animation frame already requested.");
    }

    startNextRound();
}

function startNextRound() {
    console.log("startNextRound called");
    currentRound++;
    roundInfoText.textContent = `סיבוב: ${currentRound} / ${totalRounds}`;
    resetRoundState();
    gameState = "PLACE_DROWNER";
    console.log("gameState set to PLACE_DROWNER");
    updateUI();

     if (!animationFrameId) {
        console.log("Requesting animation frame from startNextRound");
        animationFrameId = requestAnimationFrame(mainLoop);
    }
}

function resetRoundState() {
    console.log("resetRoundState called");
    drowningPerson = null;
    player1EntryX = null;
    player1Time = null;
    player1Score = null;
    player2EntryX = null;
    player2Time = null;
    player2Score = null;
    optimalTime = null;
    optimalEntryX = null;
    animationStartTime = null;
    animationDuration = 0;

    clearResults();
    nextRoundButton.style.display = 'none';
    document.getElementById('mathEquations').style.display = 'none';	

    lifeguard1Pos = { x: LIFEGUARD1_START_X, y: LIFEGUARD_START_Y };
    lifeguard2Pos = { x: LIFEGUARD2_START_X, y: LIFEGUARD_START_Y };
    optimalLifeguardPos = { x: OPTIMAL_LIFEGUARD_START_X, y: LIFEGUARD_START_Y };
}

function clearResults() {
     p1TimeDisplay.textContent = "--";
     p1ScoreDisplay.textContent = "--";
     p1Face.src = 'neutral.png'; p1Face.alt = 'פ1 ניטרלי';
     p2TimeDisplay.textContent = "--";
     p2ScoreDisplay.textContent = "--";
     p2Face.src = 'neutral.png'; p2Face.alt = 'פ2 ניטרלי';
     optimalTimeDisplay.textContent = "--";
     roundWinnerDisplay.textContent = "";
}

function updateUI() {
    sandSpeedValue.textContent = vSand.toFixed(1);
    waterSpeedValue.textContent = vWater.toFixed(1);

    switch (gameState) {
        case "SETUP": statusText.textContent = "בחר מספר סיבובים ולחץ 'התחל משחק'"; break;
        case "PLACE_DROWNER": statusText.textContent = "מקם את האדם הטובע בלחיצה על אזור המים"; break;
        case "P1_CHOOSE": statusText.textContent = `תור שחקן 1: לחץ על קו המים לבחירת נקודת הכניסה`; break;
        case "P2_CHOOSE": statusText.textContent = `תור שחקן 2: לחץ על קו המים לבחירת נקודת הכניסה`; break;
        case "ANIMATING": statusText.textContent = "המצילים בדרך! צפה במירוץ..."; break;
        case "ROUND_OVER":
            statusText.textContent = `סיבוב ${currentRound} הסתיים.`;
            if (currentRound < totalRounds) {
                nextRoundButton.style.display = 'inline-block';
                newGameButton.style.display = 'none';
            } else {
                nextRoundButton.style.display = 'none';
                newGameButton.style.display = 'inline-block';
            }
            break;
        case "GAME_OVER":
             statusText.textContent = "המשחק הסתיים!";
             nextRoundButton.style.display = 'none';
             newGameButton.style.display = 'inline-block';
            break;
         default: statusText.textContent = "מצב לא ידוע: " + gameState;
    }

    roundInfoText.style.display = (gameState !== "SETUP" && gameState !== "GAME_OVER") ? 'block' : 'none';
}

function displayRoundResults() {
    console.log("displayRoundResults called");
    p1TimeDisplay.textContent = player1Time !== null && player1Time !== Infinity ? player1Time.toFixed(2) : "N/A";
    p1ScoreDisplay.textContent = player1Score !== null ? player1Score : "--";
    p1Face.src = getFaceImage(player1Score); p1Face.alt = getFaceAltText(player1Score);

    p2TimeDisplay.textContent = player2Time !== null && player2Time !== Infinity ? player2Time.toFixed(2) : "N/A";
    p2ScoreDisplay.textContent = player2Score !== null ? player2Score : "--";
    p2Face.src = getFaceImage(player2Score); p2Face.alt = getFaceAltText(player2Score);

    optimalTimeDisplay.textContent = optimalTime !== null && optimalTime !== Infinity ? optimalTime.toFixed(2) : "N/A";

    let winnerText = "";
    if (player1Time === Infinity && player2Time === Infinity) { winnerText = "אף שחקן לא הגיע!"; }
    else if (player1Time === Infinity) { winnerText = "שחקן 2 ניצח בסיבוב!"; if (gameState !== "GAME_OVER") player2Wins++; }
    else if (player2Time === Infinity) { winnerText = "שחקן 1 ניצח בסיבוב!"; if (gameState !== "GAME_OVER") player1Wins++; }
    else if (Math.abs(player1Time - player2Time) < 0.01) { winnerText = "תיקו בסיבוב!"; }
    else if (player1Time < player2Time) { winnerText = "שחקן 1 ניצח בסיבוב!"; if (gameState !== "GAME_OVER") player1Wins++; }
    else { winnerText = "שחקן 2 ניצח בסיבוב!"; if (gameState !== "GAME_OVER") player2Wins++; }
    roundWinnerDisplay.textContent = winnerText;
    displayEquations();
}

function displayEquations() {
    const equationsDiv = document.getElementById('mathEquations');
    const p1EqSpan = document.getElementById('p1Equation').querySelector('span');
    const p2EqSpan = document.getElementById('p2Equation').querySelector('span');
    const optEqSpan = document.getElementById('optimalEquation').querySelector('span');

    // נקה תוכן קודם
    p1EqSpan.innerHTML = "";
    p2EqSpan.innerHTML = "";
    optEqSpan.innerHTML = "";

    // בדוק אם יש נתונים רלוונטיים (בעיקר מיקום הטובע)
    if (!drowningPerson) {
        equationsDiv.style.display = 'none'; // אל תציג אם אין נתונים
        return;
    }

    // קבלת מהירויות (כפי שמוגדרות כרגע)
    const vs = vSand;
    const vw = vWater;

    // פונקציית עזר לעיצוב המשוואה
    const formatEquation = (startX, startY, entryX, endX, endY, totalTime) => {
        if (entryX === null || totalTime === null || totalTime === Infinity) {
            return "N/A";
        }
        const waterY = WATER_LINE_Y;
        const distSand = calculateDistance(startX, startY, entryX, waterY);
        const distWater = calculateDistance(entryX, waterY, endX, endY);

        // חישוב זמנים מפורקים (תוך שימוש בקנה מידה!)
        const scaledDistSand = distSand / DISTANCE_SCALE_FACTOR;
        const scaledDistWater = distWater / DISTANCE_SCALE_FACTOR;
        const tSand = (vs > 0) ? scaledDistSand / vs : Infinity;
        const tWater = (vw > 0) ? scaledDistWater / vw : Infinity;

        // עיצוב הטקסט - שימוש ב-toFixed לקריאות
        // √ הוא קוד ה-HTML לשורש ריבועי
        // <sup>2</sup> הוא קוד ה-HTML לחזקת 2
        let html = `T = [ √(${(entryX - startX).toFixed(0)}<sup>2</sup> + ${(waterY - startY).toFixed(0)}<sup>2</sup>) / ${DISTANCE_SCALE_FACTOR.toFixed(1)} ] / ${vs.toFixed(1)} + [ √(${(endX - entryX).toFixed(0)}<sup>2</sup> + ${(endY - waterY).toFixed(0)}<sup>2</sup>) / ${DISTANCE_SCALE_FACTOR.toFixed(1)} ] / ${vw.toFixed(1)}<br>`;
        html += `    = [ ${scaledDistSand.toFixed(1)} / ${vs.toFixed(1)} ] + [ ${scaledDistWater.toFixed(1)} / ${vw.toFixed(1)} ] = ${tSand.toFixed(2)} + ${tWater.toFixed(2)} = <strong>${totalTime.toFixed(2)}</strong> שנ'`;
        return html;
    };

    // חשב והצג עבור כל שחקן + אופטימלי
    p1EqSpan.innerHTML = formatEquation(LIFEGUARD1_START_X, LIFEGUARD_START_Y, player1EntryX, drowningPerson.x, drowningPerson.y, player1Time);
    p2EqSpan.innerHTML = formatEquation(LIFEGUARD2_START_X, LIFEGUARD_START_Y, player2EntryX, drowningPerson.x, drowningPerson.y, player2Time);
    optEqSpan.innerHTML = formatEquation(OPTIMAL_LIFEGUARD_START_X, LIFEGUARD_START_Y, optimalEntryX, drowningPerson.x, drowningPerson.y, optimalTime);

    // הצג את ה-div של המשוואות
    equationsDiv.style.display = 'block';
}

function getFaceImage(score) {
    if (score === null || score === undefined) return 'neutral.png';
    if (score >= 85) return 'happy.png';
    if (score >= 50) return 'neutral.png';
    return 'sad.png';
}
function getFaceAltText(score) {
    if (score === null || score === undefined) return 'פנים ניטרליות';
    if (score >= 85) return 'פנים שמחות';
    if (score >= 50) return 'פנים ניטרליות';
    return 'פנים עצובות';
}

function showFinalResults() {
    console.log("showFinalResults called");
    p1WinsDisplay.textContent = player1Wins;
    p2WinsDisplay.textContent = player2Wins;
    let finalWinner = "תיקו!";
    if (player1Wins > player2Wins) { finalWinner = "שחקן 1"; }
    else if (player2Wins > player1Wins) { finalWinner = "שחקן 2"; }
    gameWinnerDisplay.textContent = finalWinner;
    finalResultDiv.style.display = 'block';
    gameState = "GAME_OVER";
    console.log("gameState set to GAME_OVER");
    updateUI();
}

function handleCanvasClick(event) {
    if (gameState !== "PLACE_DROWNER" && gameState !== "P1_CHOOSE" && gameState !== "P2_CHOOSE") {
        console.log(`Click ignored. gameState: ${gameState}`); return;
    }
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    console.log(`Canvas clicked at (${clickX.toFixed(0)}, ${clickY.toFixed(0)}) during state: ${gameState}`);

    if (gameState === "PLACE_DROWNER") {
        if (clickY > WATER_LINE_Y + 10 && clickY < canvas.height - 10) {
            drowningPerson = { x: clickX, y: clickY };
            console.log("Drowning person placed. Switching to P1_CHOOSE");
            gameState = "P1_CHOOSE"; updateUI();
        } else { console.log("Click ignored: Not in water area for placing drowner."); }
    } else if (gameState === "P1_CHOOSE") {
        if (Math.abs(clickY - WATER_LINE_Y) < 15) {
            player1EntryX = clickX;
            if(drowningPerson) {
                 const distSandP1 = calculateDistance(LIFEGUARD1_START_X, LIFEGUARD_START_Y, player1EntryX, WATER_LINE_Y);
                 const distWaterP1 = calculateDistance(player1EntryX, WATER_LINE_Y, drowningPerson.x, drowningPerson.y);
                 player1Time = calculateTime(distSandP1, distWaterP1, vSand, vWater); // Uses scaling
                 console.log(`P1 choice registered at X=${player1EntryX}. Calculated time: ${player1Time.toFixed(2)}. Switching to P2_CHOOSE`);
                 gameState = "P2_CHOOSE"; updateUI();
            } else { console.error("Error: Trying to calculate P1 time without drowning person location."); }
        } else { statusText.textContent = `שחקן 1: יש ללחוץ קרוב לקו המים!`; console.log("P1 click ignored - not near waterline."); }
    } else if (gameState === "P2_CHOOSE") {
         console.log(`Checking P2 click. Click Y: ${clickY.toFixed(1)}, Waterline Y: ${WATER_LINE_Y.toFixed(1)}, Diff: ${Math.abs(clickY - WATER_LINE_Y).toFixed(1)}`);
         if (Math.abs(clickY - WATER_LINE_Y) < 15) {
            player2EntryX = clickX;
             if(drowningPerson) {
                 const distSandP2 = calculateDistance(LIFEGUARD2_START_X, LIFEGUARD_START_Y, player2EntryX, WATER_LINE_Y);
                 const distWaterP2 = calculateDistance(player2EntryX, WATER_LINE_Y, drowningPerson.x, drowningPerson.y);
                 player2Time = calculateTime(distSandP2, distWaterP2, vSand, vWater); // Uses scaling

                 console.log("Calculating optimal path...");
                 const optimalResult = findOptimalPath(OPTIMAL_LIFEGUARD_START_X, LIFEGUARD_START_Y, drowningPerson.x, drowningPerson.y, WATER_LINE_Y, vSand, vWater); // findOptimal uses calculateTime which uses scaling
                 optimalTime = optimalResult.optimalTime;
                 optimalEntryX = optimalResult.optimalEntryX;
                 console.log(`P2 choice at X=${player2EntryX}, Time: ${player2Time.toFixed(2)}. Optimal X=${optimalEntryX.toFixed(1)}, Time: ${optimalTime.toFixed(2)}`);

                 player1Score = calculateScore(player1Time, optimalTime);
                 player2Score = calculateScore(player2Time, optimalTime);
                 console.log(`Scores calculated: P1=${player1Score}, P2=${player2Score}`);

                 initiateAnimation();
                 console.log("Switching to ANIMATING state.");
                 gameState = "ANIMATING"; updateUI();
             } else { console.error("Error: Trying to calculate P2/Optimal time without drowning person location."); }
        } else { statusText.textContent = `שחקן 2: יש ללחוץ קרוב לקו המים!`; console.log("P2 click ignored - not near waterline."); }
    }
}

// --- Animation Logic ---

function initiateAnimation() {
    console.log("initiateAnimation called");
    lifeguard1Pos = { x: LIFEGUARD1_START_X, y: LIFEGUARD_START_Y };
    lifeguard2Pos = { x: LIFEGUARD2_START_X, y: LIFEGUARD_START_Y };
    optimalLifeguardPos = { x: OPTIMAL_LIFEGUARD_START_X, y: LIFEGUARD_START_Y };

    let maxTime = 0;
    if (player1Time !== null && player1Time !== Infinity) maxTime = Math.max(maxTime, player1Time);
    if (player2Time !== null && player2Time !== Infinity) maxTime = Math.max(maxTime, player2Time);
    if (optimalTime !== null && optimalTime !== Infinity) maxTime = Math.max(maxTime, optimalTime);

    animationDuration = (maxTime > 0 ? maxTime : 5) * 1000 + 200; // Use default 5s (scaled time) if no valid time + buffer
    animationStartTime = performance.now();
    console.log(`Animation duration set to ${animationDuration.toFixed(0)}ms (based on max SCALED time ${maxTime.toFixed(2)}s)`);

    if (!animationFrameId) {
        console.log("Requesting animation frame from initiateAnimation");
        animationFrameId = requestAnimationFrame(mainLoop);
    }
}

function updateAnimation(currentTime) {
    if (!animationStartTime || !drowningPerson) {
         if (gameState === "ANIMATING") {
              console.warn("updateAnimation called in ANIMATING state but animationStartTime or drowningPerson is missing.");
              gameState = "ROUND_OVER"; displayRoundResults(); updateUI(); animationStartTime = null;
         } return;
    }
    const elapsedTime = currentTime - animationStartTime;

    if (elapsedTime >= animationDuration) {
        console.log("Animation finished (duration reached).");
        // Ensure final positions reflect the calculated times precisely
        lifeguard1Pos = getPositionAtTime(player1Time, LIFEGUARD1_START_X, player1EntryX, drowningPerson.x, drowningPerson.y);
        lifeguard2Pos = getPositionAtTime(player2Time, LIFEGUARD2_START_X, player2EntryX, drowningPerson.x, drowningPerson.y);
        optimalLifeguardPos = getPositionAtTime(optimalTime, OPTIMAL_LIFEGUARD_START_X, optimalEntryX, drowningPerson.x, drowningPerson.y);

        console.log("Switching to ROUND_OVER state.");
        gameState = "ROUND_OVER";
        displayRoundResults();
        updateUI();
        animationStartTime = null;

        if (currentRound >= totalRounds) { showFinalResults(); }
        return;
    }

    const elapsedSeconds = elapsedTime / 1000;
    if(player1Time !== null) lifeguard1Pos = getPositionAtTime(elapsedSeconds, LIFEGUARD1_START_X, player1EntryX, drowningPerson.x, drowningPerson.y);
    if(player2Time !== null) lifeguard2Pos = getPositionAtTime(elapsedSeconds, LIFEGUARD2_START_X, player2EntryX, drowningPerson.x, drowningPerson.y);
    if(optimalTime !== null) optimalLifeguardPos = getPositionAtTime(elapsedSeconds, OPTIMAL_LIFEGUARD_START_X, optimalEntryX, drowningPerson.x, drowningPerson.y);
}

// Helper function to calculate lifeguard position at a given time t (seconds - scaled time)
function getPositionAtTime(targetTime, startX, entryX, endX, endY) {
     if (targetTime === null || targetTime === Infinity || entryX === null || !drowningPerson) { // Added check for drowningPerson
         return { x: startX, y: LIFEGUARD_START_Y };
     }

    const startY = LIFEGUARD_START_Y;
    const waterY = WATER_LINE_Y;

    // Calculate time needed for each segment using SCALED distances
    const distSand = calculateDistance(startX, startY, entryX, waterY);
    const distWater = calculateDistance(entryX, waterY, endX, endY);
    const scaledDistSand = distSand / DISTANCE_SCALE_FACTOR; // <<< שינוי 1: שימוש בקנה מידה
    const scaledDistWater = distWater / DISTANCE_SCALE_FACTOR; // <<< שינוי 1: שימוש בקנה מידה

    const timeOnSand = (vSand > 0) ? scaledDistSand / vSand : Infinity; // <<< שינוי 1: חישוב זמן על בסיס מרחק מוקטן
    const timeInWater = (vWater > 0) ? scaledDistWater / vWater : Infinity; // <<< שינוי 1: חישוב זמן על בסיס מרחק מוקטן
    const totalTime = timeOnSand + timeInWater; // This totalTime now reflects the scaled duration

    const t = Math.min(targetTime, totalTime); // Use the smaller of target or total calculated time

    let currentX, currentY;

    if (t <= timeOnSand && timeOnSand > 0.0001) { // Check > small value to avoid division by zero issues if time is tiny
        // On sand
        const fraction = t / timeOnSand;
        currentX = startX + (entryX - startX) * fraction;
        currentY = startY + (waterY - startY) * fraction;
    } else if (t > timeOnSand && timeInWater > 0.0001) {
        // In water (account for time already spent on sand)
        const timeElapsedInWater = t - timeOnSand;
        const fraction = timeElapsedInWater / timeInWater;
        currentX = entryX + (endX - entryX) * fraction;
        currentY = waterY + (endY - waterY) * fraction;
    } else if (timeOnSand < 0.0001 && t <= totalTime && totalTime > 0.0001) {
        // Started basically at or in water, or instant sand travel
         const fraction = t / totalTime;
         currentX = startX + (endX - startX) * fraction; // Interpolate directly from start to end based on total time
         currentY = startY + (endY - startY) * fraction;
    }
     else {
        // Should have reached the end, or time is zero/negative, or other edge case
        currentX = endX;
        currentY = endY;
    }

    return { x: currentX, y: currentY };
}

// --- Main Loop ---
function mainLoop(currentTime) {

    // --- Clear and Draw Base ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawWaves();
    drawTower();
    if(drowningPerson) drawDrowningPerson(drowningPerson);

    // --- Draw based on Game State ---
    if (gameState === "ANIMATING") {
        updateAnimation(currentTime);
        if(player1Time !== null) drawLifeguard(lifeguard1Pos.x, lifeguard1Pos.y, LIFEGUARD_COLOR_P1);
        if(player2Time !== null) drawLifeguard(lifeguard2Pos.x, lifeguard2Pos.y, LIFEGUARD_COLOR_P2);
        if(optimalTime !== null) drawLifeguard(optimalLifeguardPos.x, optimalLifeguardPos.y, LIFEGUARD_COLOR_OPTIMAL);

        if(player1EntryX && drowningPerson) drawPath(LIFEGUARD1_START_X, LIFEGUARD_START_Y, player1EntryX, WATER_LINE_Y, drowningPerson.x, drowningPerson.y, 'rgba(255,0,0,0.2)', 1);
        if(player2EntryX && drowningPerson) drawPath(LIFEGUARD2_START_X, LIFEGUARD_START_Y, player2EntryX, WATER_LINE_Y, drowningPerson.x, drowningPerson.y, 'rgba(0,0,255,0.2)', 1);
        if(optimalEntryX && drowningPerson) drawPath(OPTIMAL_LIFEGUARD_START_X, LIFEGUARD_START_Y, optimalEntryX, WATER_LINE_Y, drowningPerson.x, drowningPerson.y, 'rgba(0,128,0,0.2)', 1);

    } else if (gameState === "ROUND_OVER" || gameState === "GAME_OVER") {
        if (player1EntryX && drowningPerson) drawPath(LIFEGUARD1_START_X, LIFEGUARD_START_Y, player1EntryX, WATER_LINE_Y, drowningPerson.x, drowningPerson.y, PATH_COLOR_P1, 2, false);
        if (player2EntryX && drowningPerson) drawPath(LIFEGUARD2_START_X, LIFEGUARD_START_Y, player2EntryX, WATER_LINE_Y, drowningPerson.x, drowningPerson.y, PATH_COLOR_P2, 2, false);
        if (optimalEntryX && drowningPerson) drawPath(OPTIMAL_LIFEGUARD_START_X, LIFEGUARD_START_Y, optimalEntryX, WATER_LINE_Y, drowningPerson.x, drowningPerson.y, PATH_COLOR_OPTIMAL, 2, false);

        drawLifeguard(LIFEGUARD1_START_X, LIFEGUARD_START_Y, LIFEGUARD_COLOR_P1);
        drawLifeguard(LIFEGUARD2_START_X, LIFEGUARD_START_Y, LIFEGUARD_COLOR_P2);

    } else if (gameState !== "SETUP") {
        drawLifeguard(LIFEGUARD1_START_X, LIFEGUARD_START_Y, LIFEGUARD_COLOR_P1);
        drawLifeguard(LIFEGUARD2_START_X, LIFEGUARD_START_Y, LIFEGUARD_COLOR_P2);

        if(gameState === "P1_CHOOSE" || gameState === "P2_CHOOSE") {
             ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
             ctx.fillRect(0, WATER_LINE_Y - 7, canvas.width, 14);
        }
        // <<< שינוי 2: הנתיב של שחקן 1 מוסתר (השורה בהערה) >>>
         if (gameState === "P2_CHOOSE" && player1EntryX && drowningPerson) {
            // drawPath(LIFEGUARD1_START_X, LIFEGUARD_START_Y, player1EntryX, WATER_LINE_Y, drowningPerson.x, drowningPerson.y, 'rgba(255,0,0,0.5)', 1, true); // Dashed preview is now hidden
            // console.log("Currently P2's turn, P1 path preview is hidden."); // Log confirms it's hidden
         }
    }

    // --- Request Next Frame ---
    if (gameState !== "SETUP") {
        animationFrameId = requestAnimationFrame(mainLoop);
    } else {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            console.log("Animation loop cancelled as gameState is SETUP.");
        }
    }
}

// --- Event Listeners ---
startGameButton.addEventListener('click', startGame);
sandSpeedSlider.addEventListener('input', (e) => { vSand = parseFloat(e.target.value); sandSpeedValue.textContent = vSand.toFixed(1); });
waterSpeedSlider.addEventListener('input', (e) => { vWater = parseFloat(e.target.value); waterSpeedValue.textContent = vWater.toFixed(1); });
canvas.addEventListener('click', handleCanvasClick);
nextRoundButton.addEventListener('click', startNextRound);
newGameButton.addEventListener('click', () => {
    console.log("New Game button clicked");
    if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; console.log("Animation loop cancelled by New Game button."); }
    setupDiv.style.display = 'flex';
    gameAreaDiv.style.display = 'none';
    finalResultDiv.style.display = 'none';
    gameState = "SETUP"; console.log("gameState set to SETUP");
    currentRound = 0; player1Wins = 0; player2Wins = 0;
    clearResults(); resetRoundState(); updateUI();
    ctx.clearRect(0, 0, canvas.width, canvas.height); drawBackground(); drawTower();
    console.log("New Game setup complete. Waiting for 'Start Game'.");
});

// --- Initialisation ---
console.log("Script loaded. Initializing UI for SETUP state.");
gameState = "SETUP";
updateUI();
ctx.clearRect(0, 0, canvas.width, canvas.height);
drawBackground();
drawTower();
console.log("Initial static draw complete.");