package com.travelease.backend.auth;

import java.util.List;

public final class SecurityQuestions {

    public static final List<String> ALLOWED = List.of(
            "What is the name of the hospital where you were born?",
            "What is your birth hospital?",
            "What was the name of your first pet?",
            "What is your mother's maiden name?",
            "What was the name of your first school?",
            "What is your favorite book?"
    );

    private SecurityQuestions() {
    }
}
