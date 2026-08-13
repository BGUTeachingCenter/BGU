const setupDiv = document.getElementById('setup');
const gameAreaDiv = document.getElementById('gameArea');
const resultsDiv = document.getElementById('resultsF'); // Use F suffix to avoid conflict if reusing IDs
const startGameButton = document.getElementById('startGameButton');
const newGameButton = document.getElementById('newGameButton');
const numTrialsSelect = document.getElementById('numTrials');
const playerTurnH2 = document.getElementById('playerTurn');
const stimulusDiv = document.getElementById('stimulusF');
const feedbackDiv = document.getElementById('feedbackF');
const instructionTextP = document.getElementById('instructionText');
const winnerDeclarationH3 = document.getElementById('winnerDeclaration');

// Result spans (Player 1)
const p1AvgRTSpan = document.getElementById('p1AvgRT');
const p1AccSpan = document.getElementById('p1Acc');
const p1CongRTSpan = document.getElementById('p1CongRT');
const p1CongAccSpan = document.getElementById('p1CongAcc');
const p1IncongRTSpan = document.getElementById('p1IncongRT');
const p1IncongAccSpan = document.getElementById('p1IncongAcc');
const p1NeutRTSpan = document.getElementById('p1NeutRT');
const p1NeutAccSpan = document.getElementById('p1NeutAcc');
// Result spans (Player 2)
const p2AvgRTSpan = document.getElementById('p2AvgRT');
const p2AccSpan = document.getElementById('p2Acc');
const p2CongRTSpan = document.getElementById('p2CongRT');
const p2CongAccSpan = document.getElementById('p2CongAcc');
const p2IncongRTSpan = document.getElementById('p2IncongRT');
const p2IncongAccSpan = document.getElementById('p2IncongAcc');
const p2NeutRTSpan = document.getElementById('p2NeutRT');
const p2NeutAccSpan = document.getElementById('p2NeutAcc');


// --- Experiment Settings ---
const ARROW_LEFT = '←'; // Use actual arrow characters
const ARROW_RIGHT = '→';
const NEUTRAL_FLANKER = '•'; // Or '-', '■' etc.
const FLANKER_TYPES = ['congruent', 'incongruent', 'neutral'];
const N_FLANKERS = 2; // Number of flankers on each side
const FEEDBACK_DURATION_F = 600; // ms
const INTER_TRIAL_INTERVAL_F = 400; // ms

// --- Game State Variables ---
let totalTrialsPerPlayer = 12;
let trials = [];
let currentPlayer = 1;
let currentTrialIndex = 0;
let trialStartTime = 0;
let responseListenerActive = false;
let playerData = {
    1: { congruent: { rt: [], correct: 0, count: 0 }, incongruent: { rt: [], correct: 0, count: 0 }, neutral: { rt: [], correct: 0, count: 0 } },
    2: { congruent: { rt: [], correct: 0, count: 0 }, incongruent: { rt: [], correct: 0, count: 0 }, neutral: { rt: [], correct: 0, count: 0 } }
};

// --- Functions ---

function shuffleArray(array) { /* ... (same as Stroop) ... */
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function createTrialsForPlayer() {
    trials = []; // Reset trials for the current player
    const trialsPerType = totalTrialsPerPlayer / FLANKER_TYPES.length;

    FLANKER_TYPES.forEach(condition => {
        for (let i = 0; i < trialsPerType; i++) {
            const targetDirection = Math.random() < 0.5 ? ARROW_LEFT : ARROW_RIGHT;
            let flankerDirection;

            if (condition === 'congruent') {
                flankerDirection = targetDirection;
            } else if (condition === 'incongruent') {
                flankerDirection = targetDirection === ARROW_LEFT ? ARROW_RIGHT : ARROW_LEFT;
            } else { // neutral
                flankerDirection = NEUTRAL_FLANKER;
            }

            trials.push({
                target: targetDirection,
                flanker: flankerDirection,
                condition: condition,
                correctKey: targetDirection === ARROW_LEFT ? 'ArrowLeft' : 'ArrowRight'
            });
        }
    });

    trials = shuffleArray(trials);
    currentTrialIndex = 0; // Reset index for the player
    console.log(`Player ${currentPlayer} starting with ${trials.length} trials.`);
}

function displayTrial() {
    if (currentTrialIndex >= trials.length) {
        // Player finished their turn
        if (currentPlayer === 1) {
            switchPlayer();
        } else {
            showResults();
        }
        return;
    }

    const trial = trials[currentTrialIndex];
    const flanker = trial.flanker;
    const target = trial.target;
    stimulusDiv.textContent = `${flanker}${flanker}${target}${flanker}${flanker}`;
    feedbackDiv.textContent = '';
    feedbackDiv.className = 'feedback-text';

    // Wait briefly before showing stimulus and starting timer
    stimulusDiv.style.visibility = 'hidden';
    setTimeout(() => {
        stimulusDiv.style.visibility = 'visible';
        trialStartTime = performance.now();
        responseListenerActive = true;
        console.log(`P${currentPlayer} Trial ${currentTrialIndex + 1}: ${stimulusDiv.textContent} (Target: ${trial.target}, Cond: ${trial.condition}, Correct: ${trial.correctKey})`);

    }, INTER_TRIAL_INTERVAL_F);
}

function handleResponse(event) {
    if (!responseListenerActive) return;

    const keyPressed = event.key;
    // Only react to arrow keys
    if (keyPressed !== 'ArrowLeft' && keyPressed !== 'ArrowRight') {
        return;
    }

    responseListenerActive = false;
    const endTime = performance.now();
    const reactionTime = Math.round(endTime - trialStartTime);
    const currentTrial = trials[currentTrialIndex];
    const isCorrect = keyPressed === currentTrial.correctKey;
    const condition = currentTrial.condition;

    console.log(`P${currentPlayer} Resp: ${keyPressed}, Correct: ${currentTrial.correctKey}, RT: ${reactionTime}ms, Correct: ${isCorrect}`);

    // Record result for the current player
    const pData = playerData[currentPlayer][condition];
    pData.count++;
    if (isCorrect) {
        pData.correct++;
        pData.rt.push(reactionTime); // Only record RT for correct trials
        feedbackDiv.textContent = 'נכון!';
        feedbackDiv.className = 'feedback-text feedback-correct';
    } else {
        feedbackDiv.textContent = 'טעות!';
        feedbackDiv.className = 'feedback-text feedback-incorrect';
    }

    currentTrialIndex++;

    // Brief pause, then next trial
    setTimeout(() => {
        // Check again if trials finished during the pause
         if (currentTrialIndex >= trials.length) {
            if (currentPlayer === 1) {
                switchPlayer();
            } else {
                showResults();
            }
        } else {
           displayTrial();
        }
    }, FEEDBACK_DURATION_F);
}

function switchPlayer() {
    currentPlayer = 2;
    playerTurnH2.textContent = `תור שחקן ${currentPlayer}`;
    feedbackDiv.textContent = `שחקן 1 סיים. לחץ על מקש כלשהו כדי להתחיל את תור שחקן 2.`;
    feedbackDiv.className = 'feedback-text'; // Neutral feedback style
    // Temporarily listen for any key to start player 2's turn
    document.removeEventListener('keydown', handleResponse); // Remove game listener
    document.addEventListener('keydown', startPlayer2Turn, { once: true }); // Listen once for any key
}

function startPlayer2Turn() {
     console.log("Starting Player 2's turn.");
     document.removeEventListener('keydown', startPlayer2Turn); // Remove this temp listener
     feedbackDiv.textContent = ''; // Clear the message
     createTrialsForPlayer(); // Generate P2's trials
     document.addEventListener('keydown', handleResponse); // Re-attach the main response listener
     displayTrial(); // Start P2's first trial
}

function calculateAverage(arr) { /* ... (same as Stroop) ... */
    if (arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return Math.round(sum / arr.length);
}

function calculateAccuracy(correct, count) { /* ... (same as Stroop) ... */
    if (count === 0) return 0;
    return ((correct / count) * 100).toFixed(1);
}

function calculatePlayerResults(playerNum) {
    const data = playerData[playerNum];
    const results = {};
    let totalCorrect = 0;
    let totalCount = 0;
    let totalRT = [];

    FLANKER_TYPES.forEach(cond => {
        totalCorrect += data[cond].correct;
        totalCount += data[cond].count;
        totalRT = totalRT.concat(data[cond].rt); // Collect all correct RTs

        results[cond] = {
            avgRT: calculateAverage(data[cond].rt),
            accuracy: calculateAccuracy(data[cond].correct, data[cond].count)
        };
    });

    results.overall = {
        avgRT: calculateAverage(totalRT),
        accuracy: calculateAccuracy(totalCorrect, totalCount)
    };
    return results;
}


function showResults() {
    console.log("Game finished. Showing results.");
    gameAreaDiv.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
    document.removeEventListener('keydown', handleResponse); // Stop listening

    const p1Results = calculatePlayerResults(1);
    const p2Results = calculatePlayerResults(2);

    // Populate Player 1 Results
    p1AvgRTSpan.textContent = p1Results.overall.avgRT;
    p1AccSpan.textContent = p1Results.overall.accuracy;
    p1CongRTSpan.textContent = p1Results.congruent.avgRT;
    p1CongAccSpan.textContent = p1Results.congruent.accuracy;
    p1IncongRTSpan.textContent = p1Results.incongruent.avgRT;
    p1IncongAccSpan.textContent = p1Results.incongruent.accuracy;
    p1NeutRTSpan.textContent = p1Results.neutral.avgRT;
    p1NeutAccSpan.textContent = p1Results.neutral.accuracy;

    // Populate Player 2 Results
    p2AvgRTSpan.textContent = p2Results.overall.avgRT;
    p2AccSpan.textContent = p2Results.overall.accuracy;
    p2CongRTSpan.textContent = p2Results.congruent.avgRT;
    p2CongAccSpan.textContent = p2Results.congruent.accuracy;
    p2IncongRTSpan.textContent = p2Results.incongruent.avgRT;
    p2IncongAccSpan.textContent = p2Results.incongruent.accuracy;
    p2NeutRTSpan.textContent = p2Results.neutral.avgRT;
    p2NeutAccSpan.textContent = p2Results.neutral.accuracy;

    // Declare Winner (e.g., based on overall accuracy, then RT if tied)
    let winnerText = "המשחק הסתיים בתיקו!";
    if (p1Results.overall.accuracy > p2Results.overall.accuracy) {
        winnerText = "שחקן 1 ניצח (דיוק גבוה יותר)!";
    } else if (p2Results.overall.accuracy > p1Results.overall.accuracy) {
        winnerText = "שחקן 2 ניצח (דיוק גבוה יותר)!";
    } else { // Accuracy tie, check RT
        if (p1Results.overall.avgRT < p2Results.overall.avgRT) {
            winnerText = "שחקן 1 ניצח (זמן תגובה מהיר יותר)!";
        } else if (p2Results.overall.avgRT < p1Results.overall.avgRT) {
            winnerText = "שחקן 2 ניצח (זמן תגובה מהיר יותר)!";
        }
    }
     winnerDeclarationH3.textContent = winnerText;
     console.log("Player 1 Data:", playerData[1]);
     console.log("Player 2 Data:", playerData[2]);
}

function startGame() {
    console.log("startGame called");
    totalTrialsPerPlayer = parseInt(numTrialsSelect.value);
    if (totalTrialsPerPlayer % FLANKER_TYPES.length !== 0) {
        alert("מספר הניסויים חייב להתחלק ב-3 (מספר התנאים). בחר מספר אחר.");
        return;
    }

    setupDiv.classList.add('hidden');
    resultsDiv.classList.add('hidden');
    gameAreaDiv.classList.remove('hidden');

    // Reset player data
    playerData = {
        1: { congruent: { rt: [], correct: 0, count: 0 }, incongruent: { rt: [], correct: 0, count: 0 }, neutral: { rt: [], correct: 0, count: 0 } },
        2: { congruent: { rt: [], correct: 0, count: 0 }, incongruent: { rt: [], correct: 0, count: 0 }, neutral: { rt: [], correct: 0, count: 0 } }
    };
    currentPlayer = 1;
    playerTurnH2.textContent = `תור שחקן ${currentPlayer}`;

    createTrialsForPlayer(); // Create trials for player 1
    document.addEventListener('keydown', handleResponse); // Start listening for key presses
    displayTrial(); // Show the first trial
}

function resetGame() {
    resultsDiv.classList.add('hidden');
    gameAreaDiv.classList.add('hidden');
    setupDiv.classList.remove('hidden');
    stimulusDiv.textContent = '';
    feedbackDiv.textContent = '';
    document.removeEventListener('keydown', handleResponse); // Stop listening if game ended abruptly
    document.removeEventListener('keydown', startPlayer2Turn); // Remove temp listener if active
}

// --- Event Listeners ---
startGameButton.addEventListener('click', startGame);
newGameButton.addEventListener('click', resetGame);