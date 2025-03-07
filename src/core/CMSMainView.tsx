import React from "react";
import {
    createStyles,
    CssBaseline,
    makeStyles,
    Theme,
    ThemeProvider
} from "@material-ui/core";
import firebase from "firebase/app";
import "firebase/auth";

import CircularProgressCenter from "./internal/CircularProgressCenter";
import { CMSDrawer } from "./CMSDrawer";
import { CMSRouterSwitch } from "./CMSRouterSwitch";
import { CMSAppBar } from "./internal/CMSAppBar";
import { useAuthController, useCMSAppContext } from "../contexts";
import { LoginView } from "./LoginView";

import { MuiPickersUtilsProvider } from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import * as locales from "date-fns/locale";

/**
 * @category Core
 */
export interface CMSMainViewProps {

    /**
     * Name of the app, displayed as the main title and in the tab title
     */
    name: string;

    /**
     * Logo to be displayed in the drawer of the CMS
     */
    logo?: string;

    /**
     * If authentication is enabled, allow the user to access the content
     * without login.
     */
    allowSkipLogin?: boolean;

    /**
     * A component that gets rendered on the upper side of the main toolbar
     */
    toolbarExtraWidget?: React.ReactNode;

}

const DEFAULT_SIGN_IN_OPTIONS = [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID
];

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        logo: {
            padding: theme.spacing(3),
            maxWidth: 240
        },
        main: {
            display: "flex",
            flexDirection: "column",
            width: "100vw",
            height: "100vh"
        },
        content: {
            flexGrow: 1,
            width: "100%",
            height: "100%",
            overflow: "auto"
        },
        tableNoBottomBorder: {
            "&:last-child th, &:last-child td": {
                borderBottom: 0
            }
        },
        filter: {
            flexGrow: 1,
            padding: theme.spacing(1)
        },
        tree: {
            height: 216,
            flexGrow: 1,
            maxWidth: 400
        }
    })
);

/**
 * This is the main view of the CMS, it will display the login screen
 * if the user is not authenticated or the main app otherwise.
 *
 * It is in charge of displaying the navigation drawer, top bar and main
 * collection views.
 *
 * @param props
 * @constructor
 * @category Core
 */
export function CMSMainView(props: CMSMainViewProps) {

    const {
        name,
        logo,
        toolbarExtraWidget,
        allowSkipLogin
    } = props;

    const cmsAppContext = useCMSAppContext();
    const theme = cmsAppContext.theme;
    const signInOptions = cmsAppContext.cmsAppConfig.signInOptions ?? DEFAULT_SIGN_IN_OPTIONS;
    const locale = cmsAppContext.cmsAppConfig.locale;

    const dateUtilsLocale = locale ? locales[locale] : undefined;

    const classes = useStyles();

    const [drawerOpen, setDrawerOpen] = React.useState(false);

    const handleDrawerToggle = () => setDrawerOpen(!drawerOpen);
    const closeDrawer = () => setDrawerOpen(false);

    const authController = useAuthController();

    if (authController.authLoading) {
        return <CircularProgressCenter/>;
    }

    let view;
    if (!authController.canAccessMainView) {
        view = (
            <LoginView
                logo={logo}
                skipLoginButtonEnabled={allowSkipLogin}
                signInOptions={signInOptions}
                firebaseConfig={cmsAppContext.firebaseConfig}/>
        );
    } else if (cmsAppContext.navigationLoadingError) {
        view = (
            <div>
                <p>There was an error while loading
                    your navigation config</p>
                <p>{cmsAppContext.navigationLoadingError}</p>
            </div>
        );
    } else {

        if (!cmsAppContext.navigation) {
            return <CircularProgressCenter/>;
        }

        const collections = cmsAppContext.navigation.collections;
        const cmsViews = cmsAppContext.navigation.views;

        view = (
            <>
                <nav>
                    <CMSDrawer logo={logo}
                               drawerOpen={drawerOpen}
                               collections={collections}
                               closeDrawer={closeDrawer}
                               cmsViews={cmsViews}/>
                </nav>

                <div className={classes.main}>
                    <CMSAppBar title={name}
                               handleDrawerToggle={handleDrawerToggle}
                               toolbarExtraWidget={toolbarExtraWidget}/>

                    <main
                        className={classes.content}>
                        <CMSRouterSwitch
                            collections={collections}
                            views={cmsViews}/>
                    </main>
                </div>
            </>
        );
    }


    return (

        <MuiPickersUtilsProvider
            utils={DateFnsUtils}
            locale={dateUtilsLocale}>
            <DndProvider backend={HTML5Backend}>
                <ThemeProvider theme={theme}>
                    <CssBaseline/>
                    {view}
                </ThemeProvider>
            </DndProvider>
        </MuiPickersUtilsProvider>
    );


}

