import firebase from "firebase/app";
import "firebase/auth";

import React, { useContext, useEffect } from "react";
import { Authenticator } from "../models";

interface AuthProviderProps {
    authController: AuthController,
}

/**
 * Controller for retrieving the logged user or performing auth related operations
 * @category Hooks and utilities
 */
export interface AuthController {

    /**
     * The Firebase user currently logged in
     * Either the Firebase user, null if they skipped login or undefined
     * if they are in the login screen
     */
    loggedUser: firebase.User | null;

    /**
     * Has the user completed the steps to access the main view, after the
     * login screen
     */
    canAccessMainView: boolean;

    /**
     * Error dispatched by the auth provider
     */
    authProviderError: any;

    /**
     * Set an auth provider error
     * @param error
     */
    setAuthProviderError: (error: any) => void;

    /**
     * Is the login process ongoing
     */
    authLoading: boolean;

    /**
     *
     * @param loading
     */
    setAuthLoading: (loading: boolean) => void;

    /**
     * Is the login skipped
     */
    loginSkipped: boolean;

    /**
     * The current user was not allowed access
     */
    notAllowedError: boolean;

    /**
     * Skip login
     */
    skipLogin: () => void;

    /**
     * Sign out
     */
    signOut: () => void;

    /**
     * Utility field you can use to store your custom data.
     * e.g: Additional user data fetched from a Firestore document, or custom
     * claims
     */
    extra?: any;

    /**
     * You can use this method to store any extra data you would like to
     * associate your user to.
     * e.g: Additional user data fetched from a Firestore document, or custom
     * claims
     */
    setExtra: (extra: any) => void;
}

export const AuthContext = React.createContext<AuthController>({
    loggedUser: null,
    authProviderError: null,
    canAccessMainView: false,
    setAuthProviderError: (error: Error) => {
    },
    authLoading: false,
    setAuthLoading: () => {
    },
    loginSkipped: false,
    notAllowedError: false,
    skipLogin: () => {
    },
    signOut: () => {
    },
    setExtra: (extra: any) => {
    }
});

/**
 * Hook to retrieve the AuthContext.
 *
 * Consider that in order to use this hook you need to have a parent
 * `CMSApp` or a `CMSAppProvider`
 *
 * @see AuthController
 * @category Hooks and utilities
 */
export const useAuthController = () => useContext<AuthController>(AuthContext);

export const AuthProvider: React.FC<AuthProviderProps> = (
    {
        children,
        authController
    }) => {

    return (
        <AuthContext.Provider
            value={{
                ...authController
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

interface AuthHandlerProps {
    authentication?: boolean | Authenticator;
}

export const useAuthHandler = (
    {
        authentication
    }: AuthHandlerProps): AuthController => {

    const [loggedUser, setLoggedUser] = React.useState<firebase.User | null>(null);
    const [authProviderError, setAuthProviderError] = React.useState<any>();

    const [authLoading, setAuthLoading] = React.useState(true);
    const [loginSkipped, setLoginSkipped] = React.useState<boolean>(false);
    const [notAllowedError, setNotAllowedError] = React.useState<boolean>(false);
    const [extra, setExtra] = React.useState<any>();

    useEffect(() => {
        return firebase.auth().onAuthStateChanged(
            onAuthStateChanged,
            error => setAuthProviderError(error)
        );
    }, []);

    const onAuthStateChanged = async (user: firebase.User | null) => {

        setNotAllowedError(false);

        if (authentication instanceof Function && user) {
            const allowed = await authentication(user);
            if (allowed)
                setLoggedUser(user);
            else
                setNotAllowedError(true);
        } else {
            setLoggedUser(user);
        }

        setAuthLoading(false);
    };

    function skipLogin() {
        setNotAllowedError(false);
        setLoginSkipped(true);
        setLoggedUser(null);
        setAuthProviderError(null);
    }

    function signOut() {
        firebase.auth().signOut()
            .then(_ => {
                setNotAllowedError(false);
                setLoginSkipped(false);
                setLoggedUser(null);
                setAuthProviderError(null);
            });
    }

    const authenticationEnabled = authentication === undefined || !!authentication;
    const canAccessMainView = (!authenticationEnabled || Boolean(loggedUser) || loginSkipped) && !notAllowedError;

    return {
        loggedUser,
        authProviderError,
        setAuthProviderError,
        authLoading,
        setAuthLoading,
        loginSkipped,
        notAllowedError,
        skipLogin,
        signOut,
        canAccessMainView,
        extra,
        setExtra
    };
};

