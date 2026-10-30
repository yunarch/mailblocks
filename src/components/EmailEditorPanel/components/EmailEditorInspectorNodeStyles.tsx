import { Inspector, type InspectorNodeContext } from '@react-email/editor/ui';
import { useCurrentEditor } from '@tiptap/react';
import {
  EmailEditorInspectorDivider,
  setNodeStyles,
} from './EmailEditorInspectorDivider';

export const EmailEditorInspectorNodeStyles = (
  context: InspectorNodeContext
) => {
  const { editor } = useCurrentEditor();
  const isDivider = context.nodeType === 'horizontalRule';
  const { pos } = context.nodePos;
  const styleContext: InspectorNodeContext =
    isDivider && editor
      ? {
          ...context,
          setStyle: (prop, value) => {
            setNodeStyles(editor, pos, [[prop, value]]);
          },
          batchSetStyle: (changes) => {
            setNodeStyles(
              editor,
              pos,
              changes.map(({ prop, value }) => [prop, value])
            );
          },
        }
      : context;
  const borderContext: InspectorNodeContext = isDivider
    ? {
        ...context,
        getStyle: () => {
          /* empty */
        },
      }
    : context;

  // Render
  return (
    <>
      {isDivider ? (
        <EmailEditorInspectorDivider {...styleContext} />
      ) : (
        <Inspector.Background {...context} />
      )}
      <Inspector.Size {...styleContext} />
      <Inspector.Padding {...styleContext} />
      <div hidden={isDivider}>
        <Inspector.Border {...borderContext} />
        <Inspector.ColumnSpacing {...context} />
      </div>
    </>
  );
};
