import React from "react";
import { cx, css } from "emotion";

export const Toolbar = React.forwardRef(({ className, ...props }, ref) => (
    <div
        {...props}
        ref={ref}
        className={cx(
            className,
            css`
                & > * {
                    width: 100%;
                    display: inline-block;
                }
                & > * + * {
                    margin-left: 15px;
                    border-left: rgb(206, 204, 215) solid 1px;
                }
            `
        )}
    />
));
