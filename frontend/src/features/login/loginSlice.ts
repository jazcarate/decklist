import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "../../app/store"
import { login } from "./loginAPI"

export interface LoginState {
    token: string | null
}

const initialState: LoginState = {
    token: null
}

export const loginAsync = createAsyncThunk(
    "login/login",
    async () => {
        return await login();
    },
)

export const loginSlice = createSlice({
    name: "login",
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginAsync.pending, (state) => {
                state.token = null
            })
            .addCase(loginAsync.fulfilled, (state, action) => {
                state.token = action.payload
            })
            .addCase(loginAsync.rejected, () => {
                console.error("Could not login!");
            })
    },
})

export const selectToken = (state: RootState) => state.login.token

export default loginSlice.reducer;
