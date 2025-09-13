# RN Show More Text

A React Native component that intelligently truncates text with a customizable "Show more"/"Show less" functionality.

## Getting Started

```sh
yarn add rn-show-more-text
```

or

```sh
npm install rn-show-more-text
```

## Usage

<video src="https://private-user-images.githubusercontent.com/176748633/444112592-05bc25eb-3f49-4646-b7d4-f07607722fd2.mp4?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NDczMTI3MjQsIm5iZiI6MTc0NzMxMjQyNCwicGF0aCI6Ii8xNzY3NDg2MzMvNDQ0MTEyNTkyLTA1YmMyNWViLTNmNDktNDY0Ni1iN2Q0LWYwNzYwNzcyMmZkMi5tcDQ_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjUwNTE1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI1MDUxNVQxMjMzNDRaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT03MWJiNDk4YjA0ZDAwYjVhYmI4NzQ5ODIzMzQzOWYzNGIzZTUyMjhkOTdjMjI1ZjA2NTBlNjQxYjZjZTdhNjlmJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.e87a9ROJrpqLv5pdtYTHdoHQU1EauM9u9W2V8OHHWow"></video>

```tsx
import RNShowMoreText from "rn-show-more-text";

// Basic usage
<RNShowMoreText numberOfLines={3}>
  {
    "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
  }
</RNShowMoreText>

// With custom styling
<RNShowMoreText
  numberOfLines={3}
  readMoreStyle={{ color: 'blue', fontWeight: 'bold' }}
  readMoreText="Read more"
  readLessText="Read less"
>
  {longText}
</RNShowMoreText>

// With advanced character width customization
<RNShowMoreText
  numberOfLines={3}
  isMonospaced={false}
  shortWidthCharacters={['i', 't', 'l']}
  longWidthCharacters={['m', 'w', 'M', 'W']}
  compensationSpaceIos={1}
  compensationSpaceAndroid={0}
>
  {longText}
</RNShowMoreText>
```

## Props

The RNShowMoreText component supports the following props:

| Name                     | Type                   | Required | Default                | Description                                                                                 |
| ------------------------ | ---------------------- | -------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| numberOfLines            | number                 | Yes      | -                      | Maximum number of lines to display before truncating                                        |
| children                 | string                 | Yes      | -                      | Text content to display                                                                     |
| readMoreStyle            | StyleProp\<TextStyle\> | No       | { fontWeight: 'bold' } | Style for the "show more"/"show less" text                                                  |
| readMoreTextProps        | TextProps              | No       | -                      | Additional props for the "show more"/"show less" text component                             |
| readMoreText             | string                 | No       | "Show more"            | Custom text for the "show more" button                                                      |
| readLessText             | string                 | No       | "Show less"            | Custom text for the "show less" button                                                      |
| compensationSpaceAndroid | number                 | No       | 0                      | Extra space to account for when calculating text truncation on Android (in character width) |
| compensationSpaceIos     | number                 | No       | 1                      | Extra space to account for when calculating text truncation on iOS (in character width)     |
| isMonospaced             | boolean                | No       | false                  | Whether the font being used is monospaced (all characters have equal width)                |
| shortWidthCharacters     | string[]               | No       | []                     | Array of characters that have short width (0.5x normal character width)                    |
| longWidthCharacters      | string[]               | No       | []                     | Array of characters that have long width (1.5x normal character width)                     |

In addition, this component accepts all standard [Text Props](https://reactnative.dev/docs/text) from React Native.

## Key Features

- Intelligently calculates text truncation with proper ellipsis
- **Advanced text handling**: Supports various character widths including emojis, narrow characters (i, t, l), and wide characters (m, w, M, W)
- **Smart visual width calculation**: Automatically adjusts for different character types to ensure accurate text measurement
- Smooth animation when expanding/collapsing text
- Customizable "Show more"/"Show less" text and styling
- Works with dynamic content and container resizing
- Optimized performance with memoization
- Cross-platform compatibility with platform-specific adjustments

## How It Works

> **Note: Android instability may occur**. For example, even though the same paragraph has different lengths, on Android devices, "line bouncing" may occur. For example, if you have a string printed out with 10 lines, if you delete the last 1-2 words of the string, it may also change the number of lines and the length of the lines even with the first lines (which are actually unrelated to the last words). Currently, I do not have a solution to this problem. If anyone has a solution, please create an issue or a PR so we can discuss it, thank you.

The component intelligently calculates the average character width and determines exactly how much text can be displayed within the specified number of lines while leaving room for the "Show more" button. This ensures that text is truncated at a natural point with proper ellipsis.

`compensationSpaceIos` and `compensationSpaceAndroid` are offset parameters, where 1 unit corresponds to 1 character width. These parameters help account for platform-specific text rendering differences. For example, when we replace 8 characters "i" with 8 characters "m", it is possible to make the "Show more" text jump to a new line because they have different visual widths.

The component appends "... " (4 characters) to the truncated text before adding the "Show more" button. The compensation space provides additional buffer to prevent layout issues:

- **iOS** (default: 1): iOS text rendering is generally more predictable, requiring minimal compensation
- **Android** (default: 0): Android text rendering can be more variable, but the default works for most cases

Basically, the larger the compensation space, the less likely it is that "Show more" will jump to the next line. The smaller the compensation space, the more space it will create on the right. You may need to adjust these values based on your specific font and text content.

## Advanced Text Handling

This component provides sophisticated text handling capabilities that go beyond simple character counting. It intelligently handles various types of characters with different visual widths:

### Character Width Classification

- **Short Width Characters (0.5x)**: Narrow characters like `i`, `t`, `f`, `r`, `l`, punctuation marks (`.`, `,`, `;`, `:`)
- **Normal Width Characters (1x)**: Most alphabetic characters and numbers
- **Long Width Characters (1.5x)**: Wide characters like `m`, `w`, `M`, `W`
- **Emoji Characters (2x)**: All emoji characters take approximately double the width of normal characters

### Smart Visual Width Calculation

The component uses a sophisticated algorithm to calculate the visual width of text:

1. **Character Classification**: Each character is classified into one of the width categories above
2. **Visual Length Calculation**: The total visual width is calculated by summing the individual character widths
3. **Intelligent Truncation**: Text is truncated based on visual width rather than character count, ensuring consistent appearance

### Customization Options

You can customize the character width classification:

- `shortWidthCharacters`: Override the default list of narrow characters
- `longWidthCharacters`: Override the default list of wide characters  
- `isMonospaced`: Set to true if using a monospaced font where all characters have equal width

### Example with Mixed Content

```tsx
// Text with emojis, narrow and wide characters
<RNShowMoreText numberOfLines={2}>
  {"Hello! 👋 This text contains emojis 😊🎉, narrow characters like 'i' and 'l', and wide characters like 'M' and 'W'. The component will calculate the visual width accurately! 🚀"}
</RNShowMoreText>

// Custom character width configuration
<RNShowMoreText
  numberOfLines={3}
  shortWidthCharacters={['i', 't', 'l', 'f', 'r', '.', ',']}
  longWidthCharacters={['m', 'w', 'M', 'W', '@', '#']}
>
  {"Custom width handling for specific characters and symbols."}
</RNShowMoreText>
```

This advanced handling ensures that text truncation appears natural and consistent, regardless of the mix of character types in your content.

## License

[MIT](LICENSE)
