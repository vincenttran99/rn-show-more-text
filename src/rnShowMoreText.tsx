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
  compensationSpaceAndroid = 7,
  ...props
}: RNShowMoreTextProps): React.JSX.Element => {
  // State to track if text needs truncation with "read more" option
  const [isNeedReadMore, setIsNeedReadMore] = useState(false);
  // State used to trigger re-renders when calculations are complete
  const [renderTrigger, setRenderTrigger] = useState(false);
  // State to track if full text is currently displayed
  const [isShowingFullText, setIsShowingFullText] = useState(false);

  // Refs to store text content in different states
  const fullTextRef = useRef(children);
  const truncatedTextRef = useRef(children);

  // Refs for layout calculations
  const containerWidthRef = useRef<number>(0);
  const textLinesRef = useRef<TextLayoutLine[]>([]);
  const isCalculationCompleteRef = useRef(false);
  const hasPropsChangedRef = useRef(false);

  // Calculate the length of "see more" text plus compensation space
  const readMoreTextLength = useMemo(
    () => (readMoreText || "Show more").length + compensationSpaceAndroid,
    [compensationSpaceAndroid, readMoreText]
  );

  /**
   * Reset calculation state when props change
   */
  useLayoutEffect(() => {
    // Mark that props have changed, requiring recalculation
    hasPropsChangedRef.current = true;
    fullTextRef.current = children;
    textLinesRef.current = [];
    containerWidthRef.current = 0;
    // Trigger re-render to start new calculation
    setRenderTrigger((prev) => !prev);

    return () => {
      isCalculationCompleteRef.current = false;
    };
  }, [children, style, readMoreStyle, numberOfLines]);

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

    // Mark calculation as complete
    isCalculationCompleteRef.current = true;
    hasPropsChangedRef.current = false;

    // Array to store average character width for each line
    let characterWidthsByLine: number[] = [];

    // Check if text exceeds the specified number of lines
    if (textLinesRef.current?.length >= numberOfLines) {
      let visibleText = "";

      // Process each visible line
      for (let i = 0; i < numberOfLines; i++) {
        visibleText = visibleText.concat(textLinesRef.current[i].text);

        // Remove trailing newline if present for width calculation
        const textWithoutNewline = textLinesRef.current[i].text.slice(
          0,
          textLinesRef.current[i].text.endsWith("\n") ? -1 : undefined
        );

        // Calculate average character width for this line
        const avgCharWidth =
          textLinesRef.current[i].width / textWithoutNewline.length;
        characterWidthsByLine.push(avgCharWidth);
      }

      // Calculate overall average character width
      let averageCharacterWidth =
        characterWidthsByLine.reduce((a, b) => a + b, 0) /
        characterWidthsByLine.length;

      // Get width of the last visible line
      let lastLineWidth = textLinesRef.current[numberOfLines - 1].width;

      // Calculate how wide the last line should be to accommodate "see more" text
      let targetLastLineWidth =
        containerWidthRef.current - averageCharacterWidth * readMoreTextLength;

      // Remove trailing newline if present
      if (visibleText.endsWith("\n")) {
        visibleText = visibleText.slice(0, -1);
      }

      // Create truncated text with ellipsis
      // If last line is already short enough, use it as is
      // Otherwise, trim characters to make room for "see more" text
      truncatedTextRef.current =
        visibleText
          .slice(
            0,
            lastLineWidth <= targetLastLineWidth
              ? undefined
              : -Math.ceil(
                  (lastLineWidth - targetLastLineWidth) / averageCharacterWidth
                )
          )
          .trim() + "... ";

      // Set current display text to truncated version
      fullTextRef.current = truncatedTextRef.current;
      setIsNeedReadMore(true);
    } else {
      // Text fits within specified lines, no need for "read more"
      setIsNeedReadMore(false);
    }

    // Trigger re-render with calculated text
    setRenderTrigger((prev) => !prev);
  }, [readMoreTextLength]);

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
    [onTextLayout, numberOfLines, readMoreTextLength]
  );

  /**
   * Toggle between showing truncated text and full text
   */
  const toggleTextExpansion = useCallback(
    (event: GestureResponderEvent) => {
      if (isShowingFullText) {
        // Switch to truncated text
        fullTextRef.current = truncatedTextRef.current;
        setIsShowingFullText(false);
      } else {
        // Switch to full text
        fullTextRef.current = children;
        setIsShowingFullText(true);
      }

      // Call any onPress handler provided in readMoreTextProps
      readMoreTextProps?.onPress?.(event);
    },
    [isShowingFullText, children, readMoreTextProps?.onPress]
  );

  /**
   * Handle container layout to get width information
   */
  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    // Skip if calculation is already complete
    if (isCalculationCompleteRef.current) {
      return;
    }

    // Store container width from layout event
    containerWidthRef.current = event.nativeEvent?.layout?.width || 0;
    calculateTruncatedText();
  }, []);

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
          opacity: isCalculationCompleteRef.current
            ? StyleSheet.flatten(style || {})?.opacity
            : 0,
        },
      ]}
      {...props}
    >
      {fullTextRef.current}
      {isNeedReadMore ? (
        <Text
          style={[styles.readMoreText, readMoreStyle]}
          {...readMoreTextProps}
          onPress={toggleTextExpansion}
        >
          {isShowingFullText
            ? " " + (readLessText || "Show less")
            : readMoreText || "Show more"}
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
