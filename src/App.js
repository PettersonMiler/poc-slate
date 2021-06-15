import React, {
    useState,
    useMemo,
    useRef,
    useEffect,
    useCallback,
} from "react";
import {
    Editor,
    Transforms,
    Range,
    createEditor,
    Node,
    Element as SlateElement,
} from "slate";
import {
    Slate,
    Editable,
    withReact,
    ReactEditor,
    useSelected,
    useFocused,
    useSlate,
} from "slate-react";
import { withHistory } from "slate-history";
import isUrl from "is-url";

import "./App.css";
import { CHARACTERS } from "./characters";
import { Portal } from "./Portal";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Toolbar } from "./Toolbar";

const initialValue = [
    {
        type: "paragraph",
        children: [
            { text: "This is editable plain text, just like a <textarea>!" },
        ],
    },
];

const App = () => {
    // mention
    const ref = useRef();
    const [target, setTarget] = useState();
    const [index, setIndex] = useState(0);
    const [search, setSearch] = useState("");
    const renderElement = useCallback((props) => <Element {...props} />, []);
    // mention

    const [value, setValue] = useState(initialValue);
    const editor = useMemo(
        () => withLinks(withMentions(withReact(withHistory(createEditor())))),
        []
    );

    const chars = CHARACTERS.filter((c) =>
        c.toLowerCase().startsWith(search.toLowerCase())
    ).slice(0, 10);

    const onKeyDown = useCallback(
        (event) => {
            console.log("event.key", event.key, target);
            if (target) {
                switch (event.key) {
                    case "ArrowDown":
                        event.preventDefault();
                        const prevIndex =
                            index >= chars.length - 1 ? 0 : index + 1;
                        setIndex(prevIndex);
                        break;
                    case "ArrowUp":
                        event.preventDefault();
                        const nextIndex =
                            index <= 0 ? chars.length - 1 : index - 1;
                        setIndex(nextIndex);
                        break;
                    case "Tab":
                    case "Enter":
                        event.preventDefault();
                        Transforms.select(editor, target);
                        insertMention(editor, chars[index]);
                        setTarget(null);
                        break;
                    case "Escape":
                        event.preventDefault();
                        setTarget(null);
                        break;
                    default:
                        break;
                }
            }
        },
        [index, search, target]
    );

    useEffect(() => {
        if (target && chars.length > 0) {
            const el = ref.current;
            const domRange = ReactEditor.toDOMRange(editor, target);
            const rect = domRange.getBoundingClientRect();
            el.style.top = `${rect.top + window.pageYOffset + 24}px`;
            el.style.left = `${rect.left + window.pageXOffset}px`;
        }
    }, [chars.length, editor, index, search, target]);

    const serialize = (nodes) => {
        console.log("n", nodes);
        return nodes.map((n) => Node.string(n)).join("\n");
    };

    console.log("serialize", serialize(value));

    return (
        <div className="App">
            <div className="content">
                <Slate
                    editor={editor}
                    value={value}
                    // onChange={(value) => setValue(value)}
                    onChange={(value) => {
                        setValue(value);
                        const { selection } = editor;

                        if (selection && Range.isCollapsed(selection)) {
                            const [start] = Range.edges(selection);
                            console.log("selection", selection);
                            const wordBefore = Editor.before(editor, start, {
                                unit: "word",
                            });
                            const before =
                                wordBefore && Editor.before(editor, wordBefore);
                            const beforeRange =
                                before && Editor.range(editor, before, start);
                            const beforeText =
                                beforeRange &&
                                Editor.string(editor, beforeRange);
                            console.log("beforeText", beforeText);
                            const beforeMatch =
                                beforeText && beforeText.match(/^@(\w+)$/);
                            const after = Editor.after(editor, start);
                            const afterRange = Editor.range(
                                editor,
                                start,
                                after
                            );
                            const afterText = Editor.string(editor, afterRange);
                            const afterMatch = afterText.match(/^(\s|$)/);

                            console.log("afterMatch", afterMatch);

                            if (beforeMatch && afterMatch) {
                                setTarget(beforeRange);
                                setSearch(beforeMatch[1]);
                                setIndex(0);
                                return;
                            }
                        }

                        setTarget(null);
                    }}
                >
                    <Toolbar className="toolbar">
                        <LinkButton />
                        {/* <RemoveLinkButton /> */}
                        <CouponCodeGroup
                            setTarget={setTarget}
                            setSearch={setSearch}
                            setIndex={setIndex}
                        />
                    </Toolbar>
                    <div className="editable">
                        <Editable
                            renderElement={renderElement}
                            onKeyDown={onKeyDown}
                            placeholder="Enter some text..."
                        />
                    </div>
                    {target && chars.length > 0 && (
                        <Portal>
                            <div
                                ref={ref}
                                style={{
                                    top: "-9999px",
                                    left: "-9999px",
                                    position: "absolute",
                                    zIndex: 1,
                                    padding: "3px",
                                    background: "white",
                                    borderRadius: "4px",
                                    boxShadow: "0 1px 5px rgba(0,0,0,.2)",
                                }}
                            >
                                {chars.map((char, i) => (
                                    <div
                                        key={char}
                                        style={{
                                            padding: "1px 3px",
                                            borderRadius: "3px",
                                            background:
                                                i === index
                                                    ? "#B4D5FF"
                                                    : "transparent",
                                        }}
                                    >
                                        {char}
                                    </div>
                                ))}
                            </div>
                        </Portal>
                    )}
                </Slate>
            </div>
        </div>
    );
};

const insertMention = (editor, character) => {
    const mention = {
        type: "mention",
        character,
        children: [{ text: character }],
    };
    Transforms.insertNodes(editor, mention);
    Transforms.move(editor);
};

const withMentions = (editor) => {
    const { isInline, isVoid } = editor;

    editor.isInline = (element) => {
        return element.type === "mention" ? true : isInline(element);
    };

    editor.isVoid = (element) => {
        return element.type === "mention" ? true : isVoid(element);
    };

    return editor;
};

const withLinks = (editor) => {
    const { insertData, insertText, isInline } = editor;

    editor.isInline = (element) => {
        return element.type === "link" ? true : isInline(element);
    };

    editor.insertText = (text) => {
        if (text && isUrl(text)) {
            wrapLink(editor, text);
        } else {
            insertText(text);
        }
    };

    editor.insertData = (data) => {
        const text = data.getData("text/plain");

        if (text && isUrl(text)) {
            wrapLink(editor, text);
        } else {
            insertData(data);
        }
    };

    return editor;
};

const Mention = ({ attributes, children, element }) => {
    const selected = useSelected();
    const focused = useFocused();
    return (
        <span
            {...attributes}
            contentEditable={false}
            style={{
                padding: "3px 3px 2px",
                margin: "0 1px",
                verticalAlign: "baseline",
                display: "inline-block",
                borderRadius: "4px",
                backgroundColor: "#eee",
                fontSize: "0.9em",
                boxShadow: selected && focused ? "0 0 0 2px #B4D5FF" : "none",
            }}
        >
            @{element.character}
            {children}
        </span>
    );
};

const Element = (props) => {
    const { attributes, children, element } = props;
    switch (element.type) {
        case "mention":
            return <Mention {...props} />;
        case "link":
            return (
                <a {...attributes} href={element.url}>
                    {children}
                </a>
            );
        default:
            return <p {...attributes}>{children}</p>;
    }
};

const insertLink = (editor, url) => {
    if (editor.selection) {
        wrapLink(editor, url);
    }
};

const isLinkActive = (editor) => {
    const [link] = Editor.nodes(editor, {
        match: (n) =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            n.type === "link",
    });
    return !!link;
};

const unwrapLink = (editor) => {
    Transforms.unwrapNodes(editor, {
        match: (n) =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            n.type === "link",
    });
};

const wrapLink = (editor, url) => {
    if (isLinkActive(editor)) {
        unwrapLink(editor);
    }

    const { selection } = editor;
    const isCollapsed = selection && Range.isCollapsed(selection);
    const link = {
        type: "link",
        url,
        children: isCollapsed ? [{ text: url }] : [],
    };

    if (isCollapsed) {
        Transforms.insertNodes(editor, link);
    } else {
        Transforms.wrapNodes(editor, link, { split: true });
        Transforms.collapse(editor, { edge: "end" });
    }
};

const LinkButton = () => {
    const editor = useSlate();
    return (
        <Button
            active={isLinkActive(editor)}
            onMouseDown={(event) => {
                event.preventDefault();
                const url = window.prompt("Enter the URL of the link:");
                if (!url) return;
                insertLink(editor, url);
            }}
        >
            <Icon>link</Icon>
        </Button>
    );
};

// const RemoveLinkButton = () => {
//     const editor = useSlate();

//     return (
//         <Button
//             active={isLinkActive(editor)}
//             onMouseDown={(event) => {
//                 if (isLinkActive(editor)) {
//                     unwrapLink(editor);
//                 }
//             }}
//         >
//             <Icon>link_off</Icon>
//         </Button>
//     );
// };

const CouponCodeGroup = ({ setTarget, setSearch, setIndex }) => {
    const editor = useSlate();

    return (
        <Button
            active={isLinkActive(editor)}
            onMouseDown={(event) => {
                event.preventDefault();

                const { selection } = editor;

                if (selection && Range.isCollapsed(selection)) {
                    const [start] = Range.edges(selection);

                    const after = Editor.after(editor, start);
                    const afterRange = Editor.range(editor, start, after);
                    const afterText = Editor.string(editor, afterRange);
                    const afterMatch = afterText.match(/^(\s|$)/);

                    console.log("afterMatch", afterMatch);

                    setTarget(afterRange);
                    setSearch(afterMatch[1]);
                    setIndex(0);
                    return;
                }
            }}
        >
            <Icon>coupon_code_group</Icon>
        </Button>
    );
};

export default App;
