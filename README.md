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
| compensationSpaceAndroid | number                 | No       | 7                      | Extra space to account for when calculating text truncation on Android (in character width) |
| compensationSpaceIOS     | number                 | No       | 7                      | Extra space to account for when calculating text truncation on Android (in character width) |

In addition, this component accepts all standard [Text Props](https://reactnative.dev/docs/text) from React Native.

## Key Features

- Intelligently calculates text truncation with proper ellipsis
- Smooth animation when expanding/collapsing text
- Customizable "Show more"/"Show less" text and styling
- Works with dynamic content and container resizing
- Optimized performance with memoization

## How It Works

The component intelligently calculates the average character width and determines exactly how much text can be displayed within the specified number of lines while leaving room for the "Show more" button. This ensures that text is truncated at a natural point with proper ellipsis.

`compensationSpace` is the offset parameter, 1 unit corresponds to 1 character. You can understand that for example, when we replace 8 characters i "iiiiiiiii" with 8 characters m "mmmmmmmm", it is possible to make the string "Show more" jump to a new line because they have different widths, I set the default to 7 because in addition to the phrase "Show more" "Show less" or any character you customize, I default to append "... " to the end of the string and it is 4 characters, setting the default to 7 means I am promoting an additional length of 3 characters. Basically, the larger the `compensationSpace`, the less likely it is that "Show more" will jump to the next line, the smaller the `compensationSpace`, the more space it will create on the right ("Show more" is not really long enough to reach the end of the line). The values ​​6,7,8,9,10 cover almost all common string cases, unless we have weird strings that are too short or too long with the same number of characters (e.g. iiiiiiiiiiiiiiiiiiiii or mmmmmmmmmmmmmmmmmmmmmm)

## License

[MIT](LICENSE)
