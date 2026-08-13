// --- START OF FILE stroop_variants_script.js ---

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const selectionScreen = document.getElementById('selectionScreen');
    const gameContainer = document.getElementById('gameContainer');
    const resultsArea = document.getElementById('resultsArea');

    // Correctly select the container, then listen for clicks on buttons inside it
    const variantButtonsContainer = document.querySelector('.variant-buttons');
    const variantTitle = document.getElementById('variantTitle');
    const instructionText = document.getElementById('instructionText');
    const numTrialsSelect = document.getElementById('numTrialsSelect');
    const startGameButton = document.getElementById('startGameButton');
    const instructionsArea = document.getElementById('instructionsArea');

    const testArea = document.getElementById('testArea');
    const stimulusArea = document.getElementById('stimulusArea');
    const cueText = document.getElementById('cueText'); // For Task Switching
    const stimulusDisplay = document.getElementById('stimulusDisplay');
    const responseArea = document.getElementById('responseArea');
    const keyboardInstructions = document.getElementById('keyboardInstructions'); // Kept for potential future use
    const feedbackArea = document.getElementById('feedbackArea');
    const rtDisplay = document.getElementById('rtDisplay');
    const backToSelectionButton = document.getElementById('backToSelectionButton');

    const resultsVariantName = document.getElementById('resultsVariantName');
    const resultsSummary = document.getElementById('resultsSummary');
    const resultsExplanation = document.getElementById('resultsExplanation');
    const backToSelectionButtonResults = document.getElementById('backToSelectionButtonResults');

    // --- Game State Variables ---
    let currentVariant = null;
    let totalTrials = 20;
    let currentTrialIndex = 0;
    let stimuliList = [];
    let resultsData = []; // Correctly initialized as an array
    let trialStartTime = 0;
    let responseHandler = null; // Function to handle response for the current trial

    // --- Constants ---
    const COLORS = {
        "אדום": "red",
        "כחול": "blue",
        "ירוק": "green",
        "צהוב": "yellow"
    };
    const COLOR_NAMES = Object.keys(COLORS);
    // const COLOR_VALUES = Object.values(COLORS); // Not strictly needed if using names/classes

    const EMOTIONAL_WORDS = {
        positive: ["שמחה", "אהבה", "הצלחה", "חופש", "צחוק"],
        negative: ["עצב", "כעס", "פחד", "כישלון", "כאב"],
        neutral: ["שולחן", "כיסא", "קיר", "חלון", "דרך"]
    };

    // SPATIAL_WORDS map Hebrew terms to the CSS classes we'll use (matching CSS)
    const SPATIAL_WORDS = {
        "למעלה": "top",
        "למטה": "bottom",
        "ימין": "right",
        "שמאל": "left"
    };
    const SPATIAL_POSITIONS = Object.keys(SPATIAL_WORDS);
    const SPATIAL_CLASSES = Object.values(SPATIAL_WORDS); // CSS classes: "top", "bottom", "left", "right"

    const SWITCH_CUES = {
        "צבע": "name_color",
        "מילה": "read_word"
    };
    const CUE_NAMES = Object.keys(SWITCH_CUES);

    // --- Utility Functions ---
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

    const showScreen = (screenToShow) => {
        selectionScreen.classList.add('hidden');
        gameContainer.classList.add('hidden');
        resultsArea.classList.add('hidden');
        screenToShow.classList.remove('hidden');
    };

    const clearStimulus = () => {
        stimulusDisplay.innerHTML = '';
        stimulusDisplay.style.color = 'black'; // Reset text color
        stimulusDisplay.style.fontSize = ''; // Reset font size
        stimulusDisplay.className = ''; // Reset all classes
        stimulusDisplay.style.position = ''; // Reset position style if set by spatial

           // Reset stimulus area container styles that might be set by spatial
    stimulusArea.style.position = '';
    // stimulusArea.style.height = ''; // Maybe keep height for consistency? Test this.
    stimulusArea.style.border = '1px solid #eee'; // Reset to default border

    cueText.textContent = '';
    feedbackArea.textContent = '';
    feedbackArea.className = 'feedback-text'; // Reset feedback class
    rtDisplay.textContent = 'זמן תגובה: --';
    // responseArea.innerHTML = ''; // <--- השורה הזו הוסרה/הפכה להערה

    // Detach old listener from responseArea if exists
    if (responseHandler) {
        responseArea.removeEventListener('click', responseHandler);
        responseHandler = null; // Important to reset
    }
};

    const displayFeedback = (correct, rt) => {
        feedbackArea.textContent = correct ? 'נכון!' : 'טעות!';
        feedbackArea.className = correct ? 'feedback-text feedback-correct' : 'feedback-text feedback-incorrect'; // Use CSS classes
        rtDisplay.textContent = `זמן תגובה: ${rt.toFixed(0)} ms`;
    };

    // --- Variant Setup Functions ---

    const setupClassicStroop = () => {
        variantTitle.textContent = 'סטרופ קלאסי (צבע-מילה)';
        instructionText.textContent = 'בכל ניסוי, תופיע מילה צבועה. עליך לציין את צבע הדיו של המילה, ולהתעלם ממשמעות המילה. לחץ על הכפתור המתאים לצבע הדיו.';
        responseArea.innerHTML = ''; // Clear previous buttons
        COLOR_NAMES.forEach(name => {
            const btn = document.createElement('button');
            btn.textContent = name;
            btn.dataset.response = name; // Store the response value
            // *** Use CSS classes for colors ***
            btn.classList.add(`color-button-${name}`);
            responseArea.appendChild(btn);
        });
        keyboardInstructions.classList.add('hidden');
    };

    const setupEmotionalStroop = () => {
        variantTitle.textContent = 'סטרופ רגשי';
        instructionText.textContent = 'בכל ניסוי, תופיע מילה בעלת מטען רגשי (חיובי, שלילי או ניטרלי), צבועה בצבע כלשהו. עליך לציין את צבע הדיו של המילה, ולהתעלם ממשמעות המילה. לחץ על הכפתור המתאים לצבע הדיו.';
        setupClassicStroop(); // Uses the same response buttons as classic (with CSS classes)
        variantTitle.textContent = 'סטרופ רגשי'; // Override title set by setupClassicStroop
    };

    const setupNumericalStroop = () => {
        variantTitle.textContent = 'סטרופ מספרי';
        instructionText.textContent = 'בכל ניסוי, יופיעו זוג מספרים, אחד גדול פיזית מהשני. עליך לציין איזה מספר גדול יותר בערכו המספרי, ולהתעלם מהגודל הפיזי. לחץ על הכפתור המתאים למספר הגדול יותר.';
        responseArea.innerHTML = ''; // Clear previous buttons

        const btnLeft = document.createElement('button');
        btnLeft.textContent = 'השמאלי גדול יותר';
        btnLeft.dataset.response = 'left';
        responseArea.appendChild(btnLeft);

        const btnRight = document.createElement('button');
        btnRight.textContent = 'הימני גדול יותר';
        btnRight.dataset.response = 'right';
        responseArea.appendChild(btnRight);

        // Buttons will get default grey styling from CSS
        keyboardInstructions.classList.add('hidden');
    };

    const setupSpatialStroop = () => {
        variantTitle.textContent = 'סטרופ מרחבי';
        instructionText.textContent = 'בכל ניסוי, תופיע מילה המציינת מיקום ("למעלה", "למטה", "ימין", "שמאל") במיקום מסוים על המסך. עליך לציין את מיקום המילה על המסך, ולהתעלם ממשמעות המילה. לחץ על הכפתור המתאים למיקום.';
        responseArea.innerHTML = ''; // Clear previous buttons
        SPATIAL_POSITIONS.forEach(positionWord => { // e.g., "למעלה"
            const btn = document.createElement('button');
            btn.textContent = positionWord;
            btn.dataset.response = positionWord; // Use the Hebrew word as response identifier
            responseArea.appendChild(btn);
        });
         // Buttons will get default grey styling from CSS
        keyboardInstructions.classList.add('hidden');
        // CSS handles stimulus positioning based on classes added during runTrial
    };

     const setupSwitchingStroop = () => {
        variantTitle.textContent = 'סטרופ עם החלפת משימות';
        instructionText.innerHTML = `בכל ניסוי, תופיע מילה צבועה. לפני כל מילה, יופיע רמז:<br>
                                     - אם הרמז הוא <b>"צבע"</b>: ציין את צבע הדיו של המילה.<br>
                                     - אם הרמז הוא <b>"מילה"</b>: ציין את המילה הכתובה.<br>
                                     לחץ על הכפתור המתאים לתשובה הנדרשת.`;
        responseArea.innerHTML = ''; // Buttons will be set dynamically per trial
        keyboardInstructions.classList.add('hidden');
    };

    // --- Stimulus Generation Functions ---

    const generateClassicStimuli = (n) => {
        const stimuli = [];
        const conditions = ['congruent', 'incongruent'];
        for (let i = 0; i < n; i++) {
            const condition = conditions[Math.floor(i / (n / conditions.length)) % conditions.length] || conditions[0]; // Ensure balance
            const word = getRandomElement(COLOR_NAMES);
            let colorName;
            if (condition === 'congruent') {
                colorName = word;
            } else { // incongruent
                do {
                    colorName = getRandomElement(COLOR_NAMES);
                } while (colorName === word);
            }
            const colorValue = COLORS[colorName]; // Actual color value for display
            stimuli.push({
                type: 'classic',
                condition: condition,
                text: word,
                color: colorValue,
                correctAnswer: colorName // Task is to name the color (match response button data)
            });
        }
        return shuffleArray(stimuli);
    };

    const generateEmotionalStimuli = (n) => {
        const stimuli = [];
        const wordTypes = Object.keys(EMOTIONAL_WORDS); // positive, negative, neutral
        for (let i = 0; i < n; i++) {
            const wordType = wordTypes[Math.floor(i / (n / wordTypes.length)) % wordTypes.length] || wordTypes[0]; // Ensure balance
            const word = getRandomElement(EMOTIONAL_WORDS[wordType]);
            const colorName = getRandomElement(COLOR_NAMES);
            const colorValue = COLORS[colorName];
            stimuli.push({
                type: 'emotional',
                condition: wordType, // Word type is the condition here
                text: word,
                color: colorValue,
                correctAnswer: colorName // Task is to name the color
            });
        }
        return shuffleArray(stimuli);
    };

     const generateNumericalStimuli = (n) => {
        const stimuli = [];
        const conditions = ['congruent', 'incongruent'];
        const digits = [1, 2, 3, 4, 6, 7, 8, 9]; // Avoid 5 for clarity
        for (let i = 0; i < n; i++) {
            const condition = conditions[Math.floor(i / (n / conditions.length)) % conditions.length] || conditions[0]; // Ensure balance
            let d1, d2;
            do {
                d1 = getRandomElement(digits);
                d2 = getRandomElement(digits);
            } while (d1 === d2);

            // Randomly assign left/right
            const isD1Left = Math.random() < 0.5;
            const leftDigitVal = isD1Left ? d1 : d2;
            const rightDigitVal = isD1Left ? d2 : d1;

            const correctAnswer = leftDigitVal > rightDigitVal ? 'left' : 'right';

            let leftDigitDisplay, rightDigitDisplay;
            const largeFontSize = "2em";
            const smallFontSize = "1em";

            if (condition === 'congruent') {
                // Larger value is physically larger
                if (leftDigitVal > rightDigitVal) {
                    leftDigitDisplay = `<span style="font-size: ${largeFontSize};">${leftDigitVal}</span>`;
                    rightDigitDisplay = `<span style="font-size: ${smallFontSize};">${rightDigitVal}</span>`;
                } else {
                    leftDigitDisplay = `<span style="font-size: ${smallFontSize};">${leftDigitVal}</span>`;
                    rightDigitDisplay = `<span style="font-size: ${largeFontSize};">${rightDigitVal}</span>`;
                }
            } else { // incongruent
                // Smaller value is physically larger
                 if (leftDigitVal < rightDigitVal) {
                    leftDigitDisplay = `<span style="font-size: ${largeFontSize};">${leftDigitVal}</span>`;
                    rightDigitDisplay = `<span style="font-size: ${smallFontSize};">${rightDigitVal}</span>`;
                } else {
                    leftDigitDisplay = `<span style="font-size: ${smallFontSize};">${leftDigitVal}</span>`;
                    rightDigitDisplay = `<span style="font-size: ${largeFontSize};">${rightDigitVal}</span>`;
                }
            }
            // Wrap in a container span with the CSS class, add spacing
const htmlContent = `<span class="numerical-stimulus" style="direction: ltr; display: inline-block;">${leftDigitDisplay}    ${rightDigitDisplay}</span>`;

             stimuli.push({
            type: 'numerical',
            condition: condition,
            // --- START OF CORRECTION ---
            html: htmlContent, // <<< השתמש במשתנה הנכון htmlContent
                correctAnswer: correctAnswer // 'left' or 'right'
            });
        }
        return shuffleArray(stimuli);
    };

    const generateSpatialStimuli = (n) => {
        const stimuli = [];
        const conditions = ['congruent', 'incongruent'];
        for (let i = 0; i < n; i++) {
            const condition = conditions[Math.floor(i / (n / conditions.length)) % conditions.length] || conditions[0]; // Ensure balance
            const word = getRandomElement(SPATIAL_POSITIONS); // The text to display, e.g., "למעלה"
            let positionWord; // The actual position where it appears, e.g., "למעלה"
            if (condition === 'congruent') {
                positionWord = word;
            } else { // incongruent
                do {
                    positionWord = getRandomElement(SPATIAL_POSITIONS);
                } while (positionWord === word);
            }
            const positionClass = SPATIAL_WORDS[positionWord]; // The CSS class: "top", "bottom", etc.
            stimuli.push({
                type: 'spatial',
                condition: condition,
                text: word, // Word displayed
                positionClass: positionClass, // CSS class for positioning ("top", "bottom", "left", "right")
                correctAnswer: positionWord // Task is to name the location (matches button data)
            });
        }
        return shuffleArray(stimuli);
    };

    const generateSwitchingStimuli = (n) => {
        const stimuli = [];
        let lastTaskType = null; // Track previous task for switch cost
        const minTrialsPerTask = 2; // Ensure at least a few repeats before allowing switch calculation

        for (let i = 0; i < n; i++) {
            // Ensure some task repetition before forcing switches if needed
            let cue = getRandomElement(CUE_NAMES); // "צבע" or "מילה"

            // Simple alternation might be better for controlled switch costs
            if (i > 0 && i % 4 < 2 && lastTaskType) { // Example: run blocks of 2
               cue = Object.keys(SWITCH_CUES).find(key => SWITCH_CUES[key] === lastTaskType);
            } else {
                cue = getRandomElement(CUE_NAMES);
            }

            const taskType = SWITCH_CUES[cue]; // "name_color" or "read_word"

            const word = getRandomElement(COLOR_NAMES); // The word displayed (always a color name)
            let colorName; // The name of the color it's displayed in

             // Make most trials incongruent to ensure conflict
             if (Math.random() < 0.8 || word === colorName) { // High chance of incongruent
                do {
                    colorName = getRandomElement(COLOR_NAMES);
                } while (colorName === word);
            } else { // Congruent
                 colorName = word;
            }

            const colorValue = COLORS[colorName]; // Actual color value for display

            // Determine if it's a switch trial (only relevant after the first few trials)
            const isSwitch = i >= minTrialsPerTask && lastTaskType !== null && lastTaskType !== taskType;
            // Condition is 'switch' or 'no-switch', only calculable reliably after initial trials
            const condition = i < minTrialsPerTask ? 'no-switch' : (isSwitch ? 'switch' : 'no-switch');

            let correctAnswer;
            if (taskType === 'name_color') {
                correctAnswer = colorName; // Response should be the ink color name
            } else { // read_word
                correctAnswer = word; // Response should be the word itself
            }

            stimuli.push({
                type: 'switching',
                condition: condition, // switch or no-switch
                taskType: taskType, // name_color or read_word
                cue: cue, // "צבע" or "מילה"
                text: word,
                color: colorValue,
                correctAnswer: correctAnswer
            });
            lastTaskType = taskType; // Update for next trial
        }
        // Don't shuffle after generation if we want to maintain task run lengths
        // return shuffleArray(stimuli);
        return stimuli; // Return in generated order (might have short runs)
    };

    // --- Game Flow Functions ---

    const selectVariant = (variant) => {
        console.log(`Selecting variant: ${variant}`);
        currentVariant = variant;
        resultsData = []; // Reset results when selecting a new variant
        currentTrialIndex = 0; // Reset trial index

        // Call the appropriate setup function based on the variant string
        try {
            switch (variant) {
                case 'classic':
                    setupClassicStroop();
                    break;
                case 'emotional':
                    setupEmotionalStroop();
                    break;
                case 'numerical':
                    setupNumericalStroop();
                    break;
                case 'spatial':
                    setupSpatialStroop();
                    break;
                case 'switching':
                    setupSwitchingStroop();
                    break;
                default:
                    // This case should not happen if buttons have correct data-variant
                    console.error(`Invalid variant selected: ${variant}`);
                    alert("שגיאה: גרסה לא תקינה נבחרה.");
                    currentVariant = null; // Reset variant
                    return; // Stop further processing
            }

            showScreen(gameContainer);
            instructionsArea.classList.remove('hidden'); // Show instructions first
            testArea.classList.add('hidden'); // Hide test area
            backToSelectionButton.classList.remove('hidden'); // Show back button on game screen
             console.log(`Variant ${variant} selected successfully. Showing instructions.`);

        } catch (error) {
             console.error(`Error during setup for variant ${variant}:`, error);
             alert(`שגיאה בהכנת גרסת ${variant}. נסה שוב או בחר גרסה אחרת.`);
             resetGame(); // Go back to selection if setup fails
        }
    };


    const startGame = () => {
        totalTrials = parseInt(numTrialsSelect.value, 10);
        currentTrialIndex = 0;
        resultsData = [];
         console.log(`Starting game: ${currentVariant}, Trials: ${totalTrials}`);

        // Generate stimuli based on the selected variant
        try {
            switch (currentVariant) {
                case 'classic':
                    stimuliList = generateClassicStimuli(totalTrials);
                    break;
                case 'emotional':
                    stimuliList = generateEmotionalStimuli(totalTrials);
                    break;
                case 'numerical':
                    stimuliList = generateNumericalStimuli(totalTrials);
                    break;
                case 'spatial':
                    stimuliList = generateSpatialStimuli(totalTrials);
                    break;
                case 'switching':
                    stimuliList = generateSwitchingStimuli(totalTrials);
                    break;
                 default:
                    console.error("Cannot start game, invalid currentVariant:", currentVariant);
                    return;
            }
             console.log("Stimuli generated:", stimuliList);

             if (!stimuliList || stimuliList.length === 0) {
                 console.error("Stimulus generation failed or resulted in empty list.");
                 alert("שגיאה ביצירת הגירויים. נסה שוב.");
                 return;
             }

            instructionsArea.classList.add('hidden');
            testArea.classList.remove('hidden');
            runTrial();

        } catch (error) {
            console.error(`Error during stimulus generation for ${currentVariant}:`, error);
            alert(`שגיאה ביצירת גירויים עבור גרסת ${currentVariant}. נסה שוב.`);
            // Optionally reset or go back
        }
    };

    const runTrial = () => {
        clearStimulus(); // Clear previous trial elements and styles

        if (currentTrialIndex >= totalTrials) {
            endGame();
            return;
        }

        const currentStimulus = stimuliList[currentTrialIndex];
        console.log(`Running Trial ${currentTrialIndex + 1}`, currentStimulus);

        // --- Display Stimulus based on type ---

        // Set base text and color (if applicable)
        if (currentStimulus.text) {
            stimulusDisplay.textContent = currentStimulus.text;
        }
        if (currentStimulus.color) {
             stimulusDisplay.style.color = currentStimulus.color;
        }
        if (currentStimulus.html) { // For numerical stroop using styled spans
             stimulusDisplay.innerHTML = currentStimulus.html;
             stimulusDisplay.style.fontSize = '2.5em'; // Set a base size for the container
        }

        // Apply type-specific display adjustments
        if (currentStimulus.type === 'classic' || currentStimulus.type === 'emotional') {
            stimulusDisplay.style.fontSize = '48px'; // Use size from CSS
        }
        else if (currentStimulus.type === 'numerical') {
            // Font size is handled by spans inside the HTML
             stimulusDisplay.style.fontSize = ''; // Don't override span sizes
             // The wrapping span with class 'numerical-stimulus' is added in generateNumericalStimuli
        }
        else if (currentStimulus.type === 'spatial') {
            stimulusDisplay.textContent = currentStimulus.text; // Set the word
            stimulusDisplay.className = `spatial-stimulus ${currentStimulus.positionClass}`; // Add base and specific position class
            // CSS rules like #stimulusDisplay.spatial-stimulus.top will handle positioning
        }
        else if (currentStimulus.type === 'switching') {
            cueText.textContent = `משימה: ${currentStimulus.cue}`; // Show the cue
            stimulusDisplay.style.color = currentStimulus.color;
            stimulusDisplay.style.fontSize = '48px';

            // Dynamically set response buttons based on task type
            responseArea.innerHTML = ''; // Clear existing buttons
            let options = [];
            if (currentStimulus.taskType === 'name_color') {
                 options = COLOR_NAMES; // Options are the possible colors
            } else { // read_word
                 options = COLOR_NAMES; // Options are the possible words (which are color names)
            }

            shuffleArray(options).forEach(option => { // Shuffle button order
                 const btn = document.createElement('button');
                 btn.textContent = option;
                 btn.dataset.response = option; // Response value is the color/word name

                 // Apply color class only if the task is 'name_color' for visual cue
                 if (currentStimulus.taskType === 'name_color') {
                     btn.classList.add(`color-button-${option}`);
                 }
                 // Otherwise, buttons get default grey styling from CSS

                 responseArea.appendChild(btn);
             });
        }

        // --- Set up response listener for this specific trial ---
        // Use event delegation on responseArea
        responseHandler = (event) => {
             // Check if the clicked element is a button directly inside responseArea
            const targetButton = event.target.closest('button');
             if (targetButton && responseArea.contains(targetButton)) {
                 const userResponse = targetButton.dataset.response;
                 if (userResponse !== undefined) { // Ensure the button has a response value
                    // Immediately remove listener to prevent multiple clicks for the same trial
                    responseArea.removeEventListener('click', responseHandler);
                    responseHandler = null; // Nullify the handler reference
                    handleResponse(userResponse);
                 }
            }
        };
        responseArea.addEventListener('click', responseHandler);


        // Start Timer
        trialStartTime = performance.now();
    };

    const handleResponse = (userResponse) => {
        const reactionTime = performance.now() - trialStartTime;
        if (currentTrialIndex >= stimuliList.length) {
             console.warn("handleResponse called after trials finished.");
             return;
        }
        const currentStimulus = stimuliList[currentTrialIndex];
        const correct = userResponse === currentStimulus.correctAnswer;
         console.log(`Trial ${currentTrialIndex + 1} Response: ${userResponse}, Correct: ${correct}, RT: ${reactionTime.toFixed(0)}`);


        // Record Data
        resultsData.push({
            trialIndex: currentTrialIndex,
            // stimulus: currentStimulus, // Avoid storing large objects if not needed for calculation
            condition: currentStimulus.condition,
            taskType: currentStimulus.taskType || null, // For switching
            response: userResponse,
            correct: correct,
            rt: reactionTime,
            correctAnswer: currentStimulus.correctAnswer // Store correct answer for easier debugging/review
        });

        // Display Feedback
        displayFeedback(correct, reactionTime);

        // Move to next trial after a short delay
        currentTrialIndex++;
        // Disable response area during feedback to prevent accidental clicks
        responseArea.style.pointerEvents = 'none';
        setTimeout(() => {
             responseArea.style.pointerEvents = 'auto'; // Re-enable response area
             runTrial(); // Start next trial
             }, 1200); // 1.2 second delay for feedback viewing
    };

    const endGame = () => {
        console.log("Game ended. Calculating results...");
        console.log("Raw Results Data:", resultsData);
        displayResults();
        showScreen(resultsArea);
        testArea.classList.add('hidden'); // Hide test area
        backToSelectionButton.classList.add('hidden'); // Hide back button from game screen
    };

    // --- Results Calculation and Display ---

    const calculateResults = () => {
        const numTotal = resultsData.length;
        if (numTotal === 0) return { accuracy: 0, avgRT: 0, effect: 0, explanation: "לא הושלמו ניסויים.", avgRtByCondition: {} };

        const correctTrials = resultsData.filter(r => r.correct);
        const numCorrect = correctTrials.length;
        const accuracy = (numCorrect / numTotal) * 100;
        const avgRT = numCorrect > 0 ? (correctTrials.reduce((sum, r) => sum + r.rt, 0) / numCorrect) : 0;

        let effect = 0;
        let explanation = "";
        let avgRtByCondition = {}; // Store average RT per condition

        // Calculate variant-specific effects using ONLY CORRECT trials
        try { // Add try-catch for robustness in calculations
            const rtByCondition = correctTrials.reduce((acc, r) => {
                const conditionKey = r.condition || 'unknown'; // Use condition (e.g., 'congruent', 'incongruent', 'positive', 'switch')
                if (!acc[conditionKey]) acc[conditionKey] = { sum: 0, count: 0 };
                acc[conditionKey].sum += r.rt;
                acc[conditionKey].count++;
                return acc;
            }, {});

            for (const condition in rtByCondition) {
                if (rtByCondition[condition].count > 0) {
                    avgRtByCondition[condition] = rtByCondition[condition].sum / rtByCondition[condition].count;
                }
            }
             console.log("Average RT by Condition:", avgRtByCondition);


            if (currentVariant === 'classic' || currentVariant === 'numerical' || currentVariant === 'spatial') {
                const rtCongruent = avgRtByCondition['congruent'] || 0;
                const rtIncongruent = avgRtByCondition['incongruent'] || 0;
                if (rtCongruent > 0 && rtIncongruent > 0) {
                    effect = rtIncongruent - rtCongruent;
                    explanation = `<b>אפקט סטרופ (${currentVariant === 'classic' ? 'קלאסי' : currentVariant === 'numerical' ? 'מספרי' : 'מרחבי'})</b>:
                                  ההפרש בזמן התגובה בין ניסויים לא-תואמים (Incongruent) לניסויים תואמים (Congruent).
                                  ערך חיובי מצביע על הפרעה הנגרמת מהמידע הלא-רלוונטי למשימה (למשל, משמעות המילה בצבע, הגודל הפיזי במספרים, או משמעות מילת המיקום).
                                  זמן תגובה גבוה יותר בתנאי הלא-תואם הוא הממצא הקלאסי.`;
                } else {
                    explanation = "לא היו מספיק תגובות נכונות בשני התנאים (תואם ולא-תואם) לחישוב אפקט סטרופ מהימן.";
                }
            } else if (currentVariant === 'emotional') {
                const rtNeutral = avgRtByCondition['neutral'] || 0;
                const rtPositive = avgRtByCondition['positive'] || 0;
                const rtNegative = avgRtByCondition['negative'] || 0;
                const emotionalRTs = [rtPositive, rtNegative].filter(rt => rt > 0);
                const rtEmotionalAvg = emotionalRTs.length > 0 ? emotionalRTs.reduce((a, b) => a + b, 0) / emotionalRTs.length : 0;

                if (rtNeutral > 0 && rtEmotionalAvg > 0) {
                    effect = rtEmotionalAvg - rtNeutral; // Emotional interference effect
                    explanation = `<b>אפקט סטרופ רגשי</b>:
                                   ההפרש בזמן התגובה הממוצע לזיהוי צבע של מילים רגשיות (חיוביות/שליליות) לעומת מילים ניטרליות.
                                   ערך חיובי מצביע על הפרעה רגשית: זיהוי הצבע איטי יותר עבור מילים בעלות מטען רגשי, ככל הנראה משום שמשמעות המילה מעובדת באופן אוטומטי ומושכת קשב.
                                   ניתן גם להשוות בנפרד מילים חיוביות ושליליות לניטרליות.`;
                } else {
                    explanation = "לא היו מספיק תגובות נכונות בתנאים הניטרליים והרגשיים לחישוב אפקט סטרופ רגשי מהימן.";
                }
            } else if (currentVariant === 'switching') {
                const rtSwitch = avgRtByCondition['switch'] || 0;
                const rtNoSwitch = avgRtByCondition['no-switch'] || 0; // Trials where task was same as previous
                if (rtSwitch > 0 && rtNoSwitch > 0) {
                    effect = rtSwitch - rtNoSwitch; // Switch Cost
                    explanation = `<b>עלות החלפה (Switch Cost)</b>:
                                   ההפרש בזמן התגובה בין ניסויים שבהם המשימה התחלפה (למשל, מ'צבע' ל'מילה') לבין ניסויים שבהם המשימה נשארה זהה.
                                   ערך חיובי מצביע על המאמץ הקוגניטיבי ("עלות") הנדרש לשינוי סט מנטלי והחלפת המשימה הפעילה.`;

                     // Calculate average RT per task type as well
                     const rtByTask = correctTrials.reduce((acc, r) => {
                         const taskKey = r.taskType || 'unknown';
                         if (!acc[taskKey]) acc[taskKey] = { sum: 0, count: 0 };
                         acc[taskKey].sum += r.rt;
                         acc[taskKey].count++;
                         return acc;
                     }, {});

                    const avgRtColor = (rtByTask['name_color']?.count > 0) ? rtByTask['name_color'].sum / rtByTask['name_color'].count : 0;
                    const avgRtWord = (rtByTask['read_word']?.count > 0) ? rtByTask['read_word'].sum / rtByTask['read_word'].count : 0;

                     if (avgRtColor > 0 || avgRtWord > 0) {
                         explanation += `<div class="switch-cost-detail"><strong>זמני תגובה לפי משימה:</strong><ul>`;
                         if (avgRtColor > 0) explanation += `<li>משימת צבע (Name Color): ${avgRtColor.toFixed(0)} ms</li>`;
                         if (avgRtWord > 0) explanation += `<li>משימת מילה (Read Word): ${avgRtWord.toFixed(0)} ms</li>`;
                         explanation += `</ul></div>`;
                         // Often, reading the word is faster/more automatic than naming the color.
                     }

                } else {
                    explanation = "לא היו מספיק תגובות נכונות בתנאי החלפה ואי-החלפה לחישוב מהימן של עלות ההחלפה.";
                }
            }
        } catch (error) {
            console.error("Error during results calculation:", error);
            explanation = "אירעה שגיאה במהלך חישוב התוצאות.";
        }

        return {
            accuracy: accuracy.toFixed(1),
            avgRT: avgRT.toFixed(0),
            effect: effect.toFixed(0),
            explanation: explanation,
            avgRtByCondition: avgRtByCondition // Include for detailed display
        };
    };

    const displayResults = () => {
        resultsVariantName.textContent = variantTitle.textContent; // Use the title set earlier
        const results = calculateResults();

        // Use the structure from CSS with strong for labels and span for values
        let resultsHtml = `
            <p><strong>מספר ניסויים:</strong> <span>${totalTrials}</span></p>
            <p><strong>דיוק:</strong> <span>${results.accuracy}%</span></p>
            <p><strong>זמן תגובה ממוצע (נכונות):</strong> <span>${results.avgRT} ms</span></p>
        `;

        // Add effect details
        if (results.effect !== undefined && results.explanation.includes("<b>")) { // Add effect only if calculation was likely successful
             let effectLabel = "אפקט סטרופ";
              if (currentVariant === 'switching') effectLabel = "עלות החלפה";
              else if (currentVariant === 'emotional') effectLabel = "הפרעה רגשית (ממוצע רגשי - ניטרלי)";
              else if (currentVariant === 'numerical') effectLabel = "אפקט סטרופ מספרי";
              else if (currentVariant === 'spatial') effectLabel = "אפקט סטרופ מרחבי";

            resultsHtml += `<p><strong>${effectLabel}:</strong> <span>${results.effect} ms</span></p>`;
        }

         // Optionally display RT per condition for more detail
         if (results.avgRtByCondition && Object.keys(results.avgRtByCondition).length > 0) {
             resultsHtml += `<div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;"><strong>זמני תגובה לפי תנאי:</strong>`;
             for (const condition in results.avgRtByCondition) {
                 // Make condition names more readable if needed
                 let conditionDisplay = condition;
                 if (condition === 'congruent') conditionDisplay = 'תואם';
                 else if (condition === 'incongruent') conditionDisplay = 'לא-תואם';
                 else if (condition === 'positive') conditionDisplay = 'חיובי';
                 else if (condition === 'negative') conditionDisplay = 'שלילי';
                 else if (condition === 'neutral') conditionDisplay = 'ניטרלי';
                 else if (condition === 'switch') conditionDisplay = 'החלפה';
                 else if (condition === 'no-switch') conditionDisplay = 'ללא החלפה';

                 resultsHtml += `<p style="font-size: 0.9em; justify-content: start;">
                                 <strong style="min-width: 100px;">${conditionDisplay}:</strong>
                                 <span style="text-align: right;">${results.avgRtByCondition[condition].toFixed(0)} ms</span>
                                </p>`;
             }
             resultsHtml += `</div>`;
         }

        resultsSummary.innerHTML = resultsHtml;
        resultsExplanation.innerHTML = results.explanation; // Show explanation
    };

    const resetGame = () => {
         console.log("Resetting game state and returning to selection.");
        clearStimulus();
        currentVariant = null;
        stimuliList = [];
        resultsData = [];
        currentTrialIndex = 0;
        // Reset dropdown to default
        numTrialsSelect.value = "20";
        // Ensure all screens except selection are hidden
        gameContainer.classList.add('hidden');
        resultsArea.classList.add('hidden');
        // Ensure areas within gameContainer are reset
        instructionsArea.classList.remove('hidden');
        testArea.classList.add('hidden');
        backToSelectionButton.classList.add('hidden');

        showScreen(selectionScreen); // Go back to selection screen
    };

    // --- Initial Setup ---
    const init = () => {
        console.log("Initializing Stroop Variants App...");
        showScreen(selectionScreen); // Start at selection screen

        // Add event listener for variant selection using event delegation on the container
        variantButtonsContainer.addEventListener('click', (event) => {
            // Ensure the click was on a button with a data-variant attribute
            const button = event.target.closest('button[data-variant]');
            if (button) {
                const variant = button.dataset.variant;
                console.log(`Variant button clicked: ${variant}`);
                selectVariant(variant); // Call the corrected selection function
            }
        });

        // Add event listener for start game button
        startGameButton.addEventListener('click', startGame);

        // Add event listeners for back buttons
        backToSelectionButton.addEventListener('click', resetGame);
        backToSelectionButtonResults.addEventListener('click', resetGame);
        console.log("Initialization complete. Waiting for user interaction.");
    };

    // --- Run Initialization ---
    init();

});

// --- END OF FILE stroop_variants_script.js ---
