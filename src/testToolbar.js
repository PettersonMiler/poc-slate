import React, { useMemo } from "react";
// import PropTypes from 'prop-types'
import { makeStyles } from "@material-ui/core/styles";

import { CouponCodeGroup } from "./CouponCodeGroup";

export const Toolbar = React.forwardRef(({ config }, ref) => {
    const classes = useStyles();

    const tools = useMemo(() => {
        const availableTools = {
            Shortener: (props) => <div {...props} />,
            CouponCodeGroup: (props) => <CouponCodeGroup {...props} />,
            MergeTags: (props) => <div {...props} />,
        };

        return config.map((item) => availableTools[item]);
    }, [config]);

    return <div ref={ref} className={classes.root} />;
});

const useStyles = makeStyles(() => ({
    root: {
        borderTopLeftRadius: "6px",
        borderTopRightRadius: "6px",
        backgroundColor: "rgb(250, 251, 253)",
        padding: "10px",
        borderBottom: "rgb(206, 204, 215) solid 1px",
        display: "flex",
        textAlign: "center",
        "& > *": {
            width: "100%",
            display: "inline-block",
        },
        "& > :not(:first-child)": {
            marginLeft: "15px",
            borderLeft: "rgb(206, 204, 215) solid 1px",
        },
    },
}));
