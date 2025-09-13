import React, {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextLayoutEventData,
  TextLayoutLine,
  TextProps,
  TextStyle,
} from "react-native";
import {
  balanceDiffHelper,
  calculateSlicePositionHelper,
  calculateStringWidthHelper,
  getVisualLengthHelper,
  visualSliceHelper,
} from "./helper";

/**
 * Interface for RNShowMoreText component props
 * Extends the base text component props with additional functionality
 * for handling text truncation with "see more"/"hide" options
 */
export type RNShowMoreTextProps = TextProps & {
  /** Maximum number of lines to display before truncating */
  numberOfLines: number;
  /** Text content to display */
  children: string;
  /** Style for the "see more"/"hide" text */
  readMoreStyle?: StyleProp<TextStyle>;
  /** Extra space to account for when calculating text truncation (in character width) */
  compensationSpaceIos?: number;
  compensationSpaceAndroid?: number;
  /** Additional props for the "see more"/"hide" text component */
  readMoreTextProps?: TextProps;
  /** Whether the font being used is monospaced (all characters have equal width) */
  isMonospaced?: boolean;
  /** Array of characters that have short width (0.5x normal character width) */
  shortWidthCharacters?: string[];
  /** Array of characters that have long width (1.5x normal character width) */
  longWidthCharacters?: string[];

  readMoreText?: string;
  readLessText?: string;
};

/**
 * Text component with ellipsis and "see more"/"hide" functionality
 *
 * This component intelligently truncates text to fit within a specified number of lines,
 * adding a "see more" button that allows users to expand the text to show its full content.
 *
 * Important: You should provide a width for this component for proper calculation.
 *
 * @param numberOfLines - Maximum number of lines to display before truncating
 * @param onTextLayout - Optional callback for text layout events
 * @param children - Text content to display
 * @param readMoreStyle - Style for "see more"/"hide" text
 * @param readMoreTextProps - Additional props for the "see more"/"hide" text component
 * @param style - Style for the main text component
 * @param compensationSpace - Extra space to account for when calculating text truncation
 * @param props - Additional props passed to the text component
 */
export const RNShowMoreTextComponent = ({
  numberOfLines,
  onTextLayout,
  children,
  readMoreStyle,
  readMoreTextProps,
  style,
  readMoreText,
  readLessText,
  compensationSpaceAndroid = 0,
  isMonospaced = false,
  shortWidthCharacters = [],
  longWidthCharacters = [],
  ...props
}: RNShowMoreTextProps): React.JSX.Element => {
  // State to track if text needs truncation with "read more" option
  const [isNeedReadMore, setIsNeedReadMore] = useState(false);
  // State used to trigger re-renders when calculations are complete
  const [renderTrigger, setRenderTrigger] = useState(false);
  // State to track if full text is currently displayed
  const isShowingFullTextRef = useRef(false);

  // Refs to store text content in different states
  const fullTextRef = useRef(children);
  const truncatedTextRef = useRef(children);

  // Refs for layout calculations
  const containerWidthRef = useRef<number>(0);
  const textLinesRef = useRef<TextLayoutLine[]>([]);
  const isCalculationCompleteRef = useRef(false);
  const hasPropsChangedRef = useRef(false);
  const oldChildren = useRef(children);

  const isNeedTrigger = oldChildren.current !== children;

  // Calculate the length of "Show more" text plus compensation space
  const readMoreTextContent = useMemo(
    () => `... ${(readMoreText || "Show more").trim()}`,
    [readMoreText]
  );

  /**
   * Reset calculation state when props change
   */
  useLayoutEffect(() => {
    // Mark that props have changed, requiring recalculation
    hasPropsChangedRef.current = true;
    fullTextRef.current = children;
    textLinesRef.current = [];
    isShowingFullTextRef.current = false;
    oldChildren.current = children;
    // Trigger re-render to start new calculation
    // setRenderTrigger((prev) => !prev);
    return () => {
      isCalculationCompleteRef.current = false;
    };
  }, [children, style, numberOfLines]);

  /**
   * Calculate truncated text based on available space and number of lines
   * This is the core logic that determines how much text can be shown
   * and whether a "see more" button is needed
   */
  const calculateTruncatedText = useCallback(() => {
    // Skip calculation if we don't have necessary layout information
    if (textLinesRef.current?.length === 0 || containerWidthRef.current === 0) {
      return;
    }

    // Mark calculation as complete and props as processed
    isCalculationCompleteRef.current = true;
    hasPropsChangedRef.current = false;

    // Check if text exceeds the specified number of lines
    if (textLinesRef.current?.length > numberOfLines) {
      let visibleText = ""; // Accumulates text from visible lines

      // Process each line up to the numberOfLines limit
      for (let i = 0; i < numberOfLines; i++) {
        const currentLine = textLinesRef.current[i];
        visibleText = visibleText.concat(currentLine.text);
      }

      let avgCharWidth = 0;

      // Prepare text for width calculation (remove trailing newline)
      const lastRow =
        textLinesRef.current.length >= numberOfLines
          ? textLinesRef.current[numberOfLines - 1]
          : undefined;

      const lastRowForWidthCalc = lastRow
        ? lastRow.text.endsWith("\n")
          ? lastRow.text.slice(0, -1)
          : lastRow.text
        : "";

      const lastRowVisualLength = getVisualLengthHelper(
        lastRowForWidthCalc,
        shortWidthCharacters,
        longWidthCharacters
      );

      // Calculate average character width for this line,
      // only if it has measurable text content and width.
      if (lastRowVisualLength.visualLength > 0) {
        avgCharWidth = (lastRow?.width || 0) / lastRowVisualLength.visualLength;
      }

      // Get width of the last visible line (the line at numberOfLines - 1 index)
      const lastLineWidth = textLinesRef.current[numberOfLines - 1].width;
      // Calculate the balance between the number of emojis and the number of short characters in the last line.
      const balance = balanceDiffHelper(
        lastRowVisualLength.emojiCount,
        lastRowVisualLength.shortCharCount,
        lastRowVisualLength.longCharCount
      );

      // If the balance is not zero, adjust the average character width.
      avgCharWidth =
        balance === 0
          ? avgCharWidth
          : avgCharWidth *
            (balance < 0
              ? 1 + Math.abs(balance) / lastRowVisualLength.visualLength
              : 1 - Math.abs(balance) / lastRowVisualLength.visualLength);

      // Calculate the target width for the last line to accommodate the "see more" text.
      // This is the container width minus the estimated width of "see more" text.
      const readMoreTextLength = calculateStringWidthHelper(
        readMoreTextContent,
        avgCharWidth || 1,
        isMonospaced,
        shortWidthCharacters,
        longWidthCharacters
      );

      const targetLastLineWidth =
        containerWidthRef.current - readMoreTextLength; // Use fallback 1 for avgCharWidth if it's 0

      // Remove trailing newline from the accumulated visibleText if present
      if (visibleText.endsWith("\n")) {
        visibleText = visibleText.slice(0, -1);
      }

      // Determine how many characters to trim from the end of visibleText.
      // If the last line is already short enough (lastLineWidth <= targetLastLineWidth),
      // sliceEndOffset will be undefined, meaning no characters are trimmed from visibleText itself before adding "...".
      // Otherwise, calculate a negative offset (sliceEndOffset) representing the number of characters to remove from the end.
      // The (avgCharacterWidth || 1) ensures division by a non-zero number.
      const sliceEndOffset =
        lastLineWidth <= targetLastLineWidth
          ? undefined
          : calculateSlicePositionHelper(
              lastRowForWidthCalc,
              avgCharWidth,
              readMoreTextLength + compensationSpaceAndroid * avgCharWidth,
              isMonospaced,
              shortWidthCharacters,
              longWidthCharacters
            );

      // Construct the truncated text.
      // If sliceEndOffset is defined (negative), it's used to trim characters from the end of visibleText.
      // countShortCharactersHelper adjusts the trim count, possibly for multi-byte or variable-width characters.
      truncatedTextRef.current = visualSliceHelper(
        visibleText,
        0,
        sliceEndOffset ? sliceEndOffset : undefined
      ).trim();

      // Update refs and state to reflect truncation
      fullTextRef.current = truncatedTextRef.current;
      setIsNeedReadMore(true);
    } else {
      // Text fits within specified lines, no "see more" needed
      setIsNeedReadMore(false);
    }

    // Trigger re-render with calculated text
    setRenderTrigger((prev) => !prev);
  }, [
    readMoreTextContent,
    numberOfLines,
    compensationSpaceAndroid,
    isMonospaced,
    shortWidthCharacters,
    longWidthCharacters,
  ]);

  /**
   * Handle text layout event to get line information
   * Forwards the event to any provided onTextLayout prop
   */
  const onTextLayoutHandler = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      // Forward event to any provided onTextLayout handler
      onTextLayout?.(event);

      // Skip if calculation is already complete
      if (isCalculationCompleteRef.current) {
        return;
      }

      // Store line information from layout event
      textLinesRef.current = event.nativeEvent?.lines || [];
      calculateTruncatedText();
    },
    [onTextLayout, numberOfLines, readMoreTextContent, compensationSpaceAndroid]
  );

  /**
   * Toggle between showing truncated text and full text
   */
  const toggleTextExpansion = useCallback(
    (event: GestureResponderEvent) => {
      if (isShowingFullTextRef.current) {
        // Switch to truncated text
        fullTextRef.current = truncatedTextRef.current;
        isShowingFullTextRef.current = false;
      } else {
        // Switch to full text
        fullTextRef.current = children;
        isShowingFullTextRef.current = true;
      }
      setRenderTrigger((prev) => !prev);
      // Call any onPress handler provided in readMoreTextProps
      readMoreTextProps?.onPress?.(event);
    },
    [children, readMoreTextProps?.onPress]
  );

  /**
   * Handle container layout to get width information
   */
  const onContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      // Skip if calculation is already complete

      if (isCalculationCompleteRef.current) {
        return;
      }

      // Store container width from layout event
      containerWidthRef.current = event.nativeEvent?.layout?.width || 0;
      calculateTruncatedText();
    },
    [numberOfLines]
  );

  return (
    <Text
      onLayout={onContainerLayout}
      // Trigger re-render when fullTextRef changes
      key={fullTextRef.current}
      // Pass text layout handler to get line information
      onTextLayout={onTextLayoutHandler}
      numberOfLines={
        isNeedReadMore && !hasPropsChangedRef.current
          ? undefined
          : numberOfLines
      }
      style={[
        styles.container,
        style,
        {
          // Hide text until calculation is complete
          opacity:
            !isNeedTrigger && isCalculationCompleteRef.current
              ? StyleSheet.flatten(style || {})?.opacity
              : 0,
        },
      ]}
      {...props}
    >
      {isNeedTrigger ? children : fullTextRef.current}
      {!isNeedTrigger && isNeedReadMore ? (
        <Text
          style={[styles.readMoreText, readMoreStyle]}
          {...readMoreTextProps}
          onPress={toggleTextExpansion}
        >
          {isShowingFullTextRef.current
            ? " " + (readLessText || "Show less")
            : readMoreTextContent}
        </Text>
      ) : null}
    </Text>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  readMoreText: {
    fontWeight: "bold",
  },
});

/**
 * Memoized version of RNShowMoreText component to prevent unnecessary re-renders
 */
const RNShowMoreText = memo(RNShowMoreTextComponent);
export default RNShowMoreText;
