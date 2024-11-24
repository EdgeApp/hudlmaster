/* eslint-disable no-param-reassign */
interface SlotConfigurations {
  /** User configuration for maximum item inside a reel */
  maxReelItems?: number;
  /** User configuration for whether winner should be removed from name list */
  removeWinner?: boolean;
  /** User configuration for element selector which reel items should append to */
  reelContainerSelector: string;
  /** User configuration for callback function that runs before spinning reel */
  onSpinStart?: () => void;
  /** User configuration for callback function that runs after spinning reel */
  onSpinEnd?: (winner: string) => void;

  /** User configuration for callback function that runs after user updates the name list */
  onNameListChanged?: () => void;
}
const getRandomInt = (max: number) => {
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);
  // Scale the random value to the desired range
  return randomBuffer[0] % (max + 1);
};

// Fetch Bitcoin Price Method
const fetchBitcoinPrice = async (): Promise<number> => {
  const url = 'https://rates1.edge.app/v2/exchangeRates';
  const headers = {
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    data: [{ currency_pair: 'BTC_iso:USD' }]
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }

    const result = await response.json();
    const exchangeRate = parseFloat(result.data[0].exchangeRate);
    console.log(`The current exchange rate for BTC to USD is ${exchangeRate}.`);
    return exchangeRate; // Return the exchange rate for further processing
  } catch (error) {
    console.error(`Failed to fetch the Bitcoin price: ${error}`);
    throw error; // Rethrow the error to handle it in the calling function
  }
};

/**
 * Fisher-Yates (Knuth) shuffle algo
 */
const shuffle = (array: string[]) => {
  let currentIndex = array.length;
  let randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex > 1) {
    // Pick a remaining element...
    randomIndex = getRandomInt(currentIndex - 1);
    currentIndex -= 1;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]
    ];
  }

  return array;
};

/** Class for doing random name pick and animation */
export default class Slot {
  /** List of names to draw from */
  private nameList: string[];

  /** Whether there is a previous winner element displayed in reel */
  private havePreviousWinner: boolean;

  /** Container that hold the reel items */
  private reelContainer: HTMLElement | null;

  /** Maximum item inside a reel */
  private maxReelItems: NonNullable<SlotConfigurations['maxReelItems']>;

  /** Whether winner should be removed from name list */
  private shouldRemoveWinner: NonNullable<SlotConfigurations['removeWinner']>;

  /** Reel animation object instance */
  private reelAnimation?: Animation;

  /** Callback function that runs before spinning reel */
  private onSpinStart?: NonNullable<SlotConfigurations['onSpinStart']>;

  /** Callback function that runs after spinning reel */
  private onSpinEnd?: NonNullable<SlotConfigurations['onSpinEnd']>;

  /** Callback function that runs after spinning reel */
  private onNameListChanged?: NonNullable<SlotConfigurations['onNameListChanged']>;

  /**
   * Constructor of Slot
   * @param maxReelItems  Maximum item inside a reel
   * @param removeWinner  Whether winner should be removed from name list
   * @param reelContainerSelector  The element ID of reel items to be appended
   * @param onSpinStart  Callback function that runs before spinning reel
   * @param onNameListChanged  Callback function that runs when user updates the name list
   */
  constructor(
    {
      maxReelItems = 30,
      removeWinner = true,
      reelContainerSelector,
      onSpinStart,
      onSpinEnd,
      onNameListChanged
    }: SlotConfigurations
  ) {
    this.nameList = [];
    this.havePreviousWinner = false;
    this.reelContainer = document.querySelector(reelContainerSelector);
    this.maxReelItems = maxReelItems;
    this.shouldRemoveWinner = removeWinner;
    this.onSpinStart = onSpinStart;
    this.onSpinEnd = onSpinEnd;
    this.onNameListChanged = onNameListChanged;

    // Create reel animation
    this.reelAnimation = this.reelContainer?.animate(
      [
        { transform: 'none', filter: 'blur(0)' },
        { filter: 'blur(1px)', offset: 0.5 },
        // Here we transform the reel to move up and stop at the top of last item
        // "(Number of item - 1) * height of reel item" of wheel is the amount of pixel to move up
        // 7.5rem * 16 = 120px, which equals to reel item height
        { transform: `translateY(-${(this.maxReelItems - 1) * (7.5 * 16)}px)`, filter: 'blur(0)' }
      ],
      {
        duration: 1000,
        easing: 'ease-in-out',
        iterations: 1
      }
    );

    this.reelAnimation?.cancel();
  }

  /**
   * Setter for name list
   * @param names  List of names to draw a winner from
   */
  set names(names: string[]) {
    // Randomize the names into nameList:
    this.nameList = shuffle(names);

    const reelItemsToRemove = this.reelContainer?.children
      ? Array.from(this.reelContainer.children)
      : [];

    reelItemsToRemove
      .forEach((element) => element.remove());

    this.havePreviousWinner = false;

    if (this.onNameListChanged) {
      this.onNameListChanged();
    }
  }

  /** Getter for name list */
  get names(): string[] {
    return this.nameList;
  }

  /**
   * Setter for shouldRemoveWinner
   * @param removeWinner  Whether the winner should be removed from name list
   */
  set shouldRemoveWinnerFromNameList(removeWinner: boolean) {
    this.shouldRemoveWinner = removeWinner;
  }

  /** Getter for shouldRemoveWinner */
  get shouldRemoveWinnerFromNameList(): boolean {
    return this.shouldRemoveWinner;
  }

  /**
   * Function for spinning the slot
   * @returns Whether the spin is completed successfully
   */
  public async spin(): Promise<boolean> {
    if (!this.nameList.length) {
      console.error('Name List is empty. Cannot start spinning.');
      return false;
    }

    if (this.onSpinStart) {
      this.onSpinStart();
    }

    const { reelContainer, reelAnimation, shouldRemoveWinner } = this;
    if (!reelContainer || !reelAnimation) {
      return false;
    }

    // Shuffle names and create reel items
    const randomNames = shuffle([...this.nameList]); // Use a copy to shuffle to avoid mutating the original nameList

    // Append names to the reelContainer
    const fragment = document.createDocumentFragment();
    randomNames.forEach((name) => {
      const newReelItem = document.createElement('div');
      newReelItem.textContent = name;
      fragment.appendChild(newReelItem);
    });
    reelContainer.innerHTML = ''; // Clear the existing children
    reelContainer.appendChild(fragment);

    // Scale the random value to the desired range
    const winnerIndex = getRandomInt(randomNames.length - 1);

    const winner = randomNames[winnerIndex]; // Get the winner's name from the original list

    // Play the spin animation
    const animationPromise = new Promise<void>((resolve) => {
      reelAnimation.onfinish = () => {
        // Remove all elements except for the visual winner
        Array.from(reelContainer.children).forEach((child, index) => {
          if (index !== winnerIndex) {
            child.remove();
          }
        });
        resolve();
      };
    });

    reelAnimation.play();
    await animationPromise;

    this.havePreviousWinner = true;

    if (this.onSpinEnd) {
      this.onSpinEnd(winner);
    }

    // Remove winner from name list if necessary
    if (shouldRemoveWinner) {
      this.nameList = this.nameList.filter((name) => name !== winner);
    }

    return true;
  }
}
