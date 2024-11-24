import Slot from '@js/Slot';
import SoundEffects from '@js/SoundEffects';
import confetti from 'canvas-confetti';

// Initialize slot machine
(() => {
  console.error('Initialize slot machine...');
  const drawButton = document.getElementById('draw-button') as HTMLButtonElement | null;
  const fullscreenButton = document.getElementById('fullscreen-button') as HTMLButtonElement | null;
  const settingsButton = document.getElementById('settings-button') as HTMLButtonElement | null;
  const settingsWrapper = document.getElementById('settings') as HTMLDivElement | null;
  const settingsContent = document.getElementById('settings-panel') as HTMLDivElement | null;
  const settingsSaveButton = document.getElementById('settings-save') as HTMLButtonElement | null;
  const settingsCloseButton = document.getElementById('settings-close') as HTMLButtonElement | null;
  const sunburstSvg = document.getElementById('sunburst') as HTMLImageElement | null;
  const confettiCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
  const nameListTextArea = document.getElementById('name-list') as HTMLTextAreaElement | null;
  const removeNameFromListCheckbox = document.getElementById('remove-from-list') as HTMLInputElement | null;
  const enableSoundCheckbox = document.getElementById('enable-sound') as HTMLInputElement | null;
  const luckyDrawEl = document.getElementById('lucky-draw')!;

  // Add leaderboard element
  const leaderboardEl = document.createElement('div');
  leaderboardEl.id = 'leaderboard';
  // document.querySelector('.main')!.prepend(leaderboardEl);
  // Append leaderboard to end of lucky draw
  luckyDrawEl.appendChild(leaderboardEl);

  // Graceful exit if necessary elements are not found
  if (!(
    drawButton
    && fullscreenButton
    && settingsButton
    && settingsWrapper
    && settingsContent
    && settingsSaveButton
    && settingsCloseButton
    && sunburstSvg
    && confettiCanvas
    && nameListTextArea
    && removeNameFromListCheckbox
    && enableSoundCheckbox
  )) {
    console.error('One or more Element ID is invalid. This is possibly a bug.');
    return;
  }

  // Load name pick counts from localStorage
  const namePickCoutsRaw = localStorage.getItem('namePickCounts');
  const namePickCounts: Record<string, number> = namePickCoutsRaw == null ? {}
    : JSON.parse(namePickCoutsRaw);

  if (!(confettiCanvas instanceof HTMLCanvasElement)) {
    console.error('Confetti canvas is not an instance of Canvas. This is possibly a bug.');
    return;
  }

  const soundEffects = new SoundEffects();
  const MAX_REEL_ITEMS = 40;
  const CONFETTI_COLORS = ['#ffffff', '#ebd000', '#059e00'];
  let confettiAnimationId;

  const DEV_NAMES = ['Sam', 'Jon', 'Michael', 'RJ', 'Matthew', 'Alberto', 'Daniel', 'William', 'Jared'];
  const OPS_NAMES = ['Cache', 'Peter', 'Fari'];

  /** Confeetti animation instance */
  const customConfetti = confetti.create(confettiCanvas, {
    resize: true,
    useWorker: true
  });

  /** Triggers cconfeetti animation until animation is canceled */
  const confettiAnimation = () => {
    const windowWidth = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
    const confettiScale = Math.max(0.5, Math.min(1, windowWidth / 1000));

    customConfetti({
      particleCount: 5,
      gravity: 0.3,
      spread: 360,
      origin: { y: 0.4 },
      colors: [CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]],
      scalar: confettiScale
    });

    confettiAnimationId = window.requestAnimationFrame(confettiAnimation);
  };

  /** Function to stop the winning animation */
  const stopWinningAnimation = () => {
    if (confettiAnimationId) {
      window.cancelAnimationFrame(confettiAnimationId);
    }
    sunburstSvg.style.display = 'none';
  };

  /**  Function to be trigger before spinning */
  const onSpinStart = () => {
    stopWinningAnimation();
    drawButton.disabled = true;
    settingsButton.disabled = true;
    soundEffects.spin(1.25);
  };

  const renderLeaderBoard = () => {
    // Clear existing leaderboard elements
    leaderboardEl.innerHTML = '';

    // Add a title:
    const title = document.createElement('div');
    title.textContent = 'WINNERS:';
    title.style.color = 'white';
    leaderboardEl.appendChild(title);

    // Sort counts descending
    const sortedCounts = Object.entries(namePickCounts).sort((a, b) => b[1] - a[1]);

    // Render leaderboard
    sortedCounts.forEach(([name, count]) => {
      const item = document.createElement('div');
      item.textContent = `${name}: ${count}`;
      item.style.color = 'white';
      leaderboardEl.appendChild(item);
    });
  };

  /**  Functions to be trigger after spinning */
  const onSpinEnd = async (winner: string) => {
    drawButton.disabled = false;
    settingsButton.disabled = false;

    // Increment name pick count
    namePickCounts[winner] = (namePickCounts[winner] || 0) + 1;
    // Save updated counts to localStorage
    localStorage.setItem('namePickCounts', JSON.stringify(namePickCounts));
    renderLeaderBoard();

    confettiAnimation();
    sunburstSvg.style.display = 'block';
    await soundEffects.win(winner);
  };

  /** Slot instance */
  const slot = new Slot({
    reelContainerSelector: '#reel',
    maxReelItems: MAX_REEL_ITEMS,
    onSpinStart,
    onSpinEnd,
    onNameListChanged: stopWinningAnimation
  });

  // Event listener for radio button changes
  const slotOptions = document.getElementById('slotOptions');
  if (slotOptions != null) {
    slotOptions.addEventListener('change', (event) => {
      if (event.target == null) return;
      const selectedOption = (event.target as HTMLInputElement).value;

      // Set up the Slot with the appropriate prepopulated names based on the selected radio button
      let names;

      if (selectedOption === 'radio_devqa') {
        names = DEV_NAMES;
      } else if (selectedOption === 'radio_ops') {
        names = OPS_NAMES;
      } else if (selectedOption === 'radio_allcompany') {
        names = Array.from(new Set([...DEV_NAMES, ...OPS_NAMES]));
      } else {
        names = DEV_NAMES;
      }

      // Update the names of the existing Slot instance
      slot.names = names;
    });
  }

  /** To open the setting page */
  const onSettingsOpen = () => {
    nameListTextArea.value = slot.names.length ? slot.names.join('\n') : '';
    removeNameFromListCheckbox.checked = slot.shouldRemoveWinnerFromNameList;
    enableSoundCheckbox.checked = !soundEffects.mute;
    settingsWrapper.style.display = 'block';
  };

  /** To close the setting page */
  const onSettingsClose = () => {
    settingsContent.scrollTop = 0;
    settingsWrapper.style.display = 'none';
  };

  // Click handler for "Draw" button
  drawButton.addEventListener('click', () => {
    if (!slot.names.length) {
      // onSettingsOpen();
      // return;
      slot.names = DEV_NAMES;
    }

    // const initiateSpin = () => {
    //   // Start with the current name list
    //   let namesToSpin = [...slot.names];

    //   // Populate currentNamePickCounts with existing counts or a default of 1
    //   const currentNamePickCounts: {[name: string]: number} = {};
    //   for (const name of namesToSpin) {
    //     currentNamePickCounts[name] = namePickCounts[name] || 1;
    //   }

    //   // If there is one leading pick, remove them from the list
    //   const maxPicks = Math.max(...Object.values(currentNamePickCounts));
    //   const mostPickedNames = Object.keys(currentNamePickCounts).filter(
    //     (name) => currentNamePickCounts[name] === maxPicks
    //   );

    //   if (mostPickedNames.length === 1) {
    //     namesToSpin = namesToSpin.filter((name) => name !== mostPickedNames[0]);
    //   }

    //   // Find the name(s) with the least picks
    //   const minPicks = Math.min(...Object.values(currentNamePickCounts));
    //   const leastPickedNames = Object.keys(currentNamePickCounts).filter(
    //     (name) => currentNamePickCounts[name] === minPicks
    //   );

    //   // If there's a least-picked name, add it an extra time to the list
    //   if (leastPickedNames.length) {
    //     const randomLeastPickedName = leastPickedNames[Math.floor(Math.random() * leastPickedNames.length)];
    //     namesToSpin.push(randomLeastPickedName);
    //   }

    //   // Update the slot machine's name list and initiate the spin
    //   slot.names = namesToSpin;
    //   slot.spin();
    //   setTimeout(initiateSpin, 10); // Wait for 5 seconds before the next spin
    // };
    // initiateSpin();
    slot.spin();
  });

  // Hide fullscreen button when it is not supported
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - for older browsers support
  if (!(document.documentElement.requestFullscreen && document.exitFullscreen)) {
    fullscreenButton.remove();
  }

  // Click handler for "Fullscreen" button
  fullscreenButton.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      return;
    }

    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

  // Click handler for "Settings" button
  settingsButton.addEventListener('click', onSettingsOpen);

  // Click handler for "Save" button for setting page
  settingsSaveButton.addEventListener('click', () => {
    slot.names = nameListTextArea.value
      ? nameListTextArea.value.split(/\n/).filter((name) => Boolean(name.trim()))
      : [];
    slot.shouldRemoveWinnerFromNameList = removeNameFromListCheckbox.checked;
    soundEffects.mute = !enableSoundCheckbox.checked;
    onSettingsClose();
  });

  // Click handler for "Discard and close" button for setting page
  settingsCloseButton.addEventListener('click', onSettingsClose);

  renderLeaderBoard();
})();
