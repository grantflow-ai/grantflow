from packages.shared_utils.src.stopwords import (
    ACADEMIC_FILLER_STOP_WORDS,
    ACADEMIC_STOP_WORDS,
    FREQUENCY_STOP_WORDS,
    GRANT_BUZZWORD_STOP_WORDS,
    METHODOLOGICAL_STOP_WORDS,
    QUANTITATIVE_STOP_WORDS,
    TRANSITIONAL_STOP_WORDS,
)


class TestStopWordCollections:
    def test_stop_word_sets_are_non_empty(self) -> None:
        assert len(TRANSITIONAL_STOP_WORDS) > 0
        assert len(FREQUENCY_STOP_WORDS) > 0
        assert len(QUANTITATIVE_STOP_WORDS) > 0
        assert len(METHODOLOGICAL_STOP_WORDS) > 0
        assert len(ACADEMIC_FILLER_STOP_WORDS) > 0
        assert len(GRANT_BUZZWORD_STOP_WORDS) > 0
        assert len(ACADEMIC_STOP_WORDS) > 0

    def test_academic_stop_words_contains_all_categories(self) -> None:
        expected_words = (
            TRANSITIONAL_STOP_WORDS
            | FREQUENCY_STOP_WORDS
            | QUANTITATIVE_STOP_WORDS
            | METHODOLOGICAL_STOP_WORDS
            | ACADEMIC_FILLER_STOP_WORDS
            | GRANT_BUZZWORD_STOP_WORDS
        )
        assert ACADEMIC_STOP_WORDS == expected_words

    def test_stop_words_are_lowercase(self) -> None:
        for word_set in [
            TRANSITIONAL_STOP_WORDS,
            FREQUENCY_STOP_WORDS,
            QUANTITATIVE_STOP_WORDS,
            METHODOLOGICAL_STOP_WORDS,
            ACADEMIC_FILLER_STOP_WORDS,
            GRANT_BUZZWORD_STOP_WORDS,
        ]:
            for word in word_set:
                assert word == word.lower(), f"Word '{word}' is not lowercase"

    def test_no_duplicate_words_across_categories(self) -> None:
        all_words: list[str] = []
        categories = [
            TRANSITIONAL_STOP_WORDS,
            FREQUENCY_STOP_WORDS,
            QUANTITATIVE_STOP_WORDS,
            METHODOLOGICAL_STOP_WORDS,
            ACADEMIC_FILLER_STOP_WORDS,
            GRANT_BUZZWORD_STOP_WORDS,
        ]

        for category in categories:
            all_words.extend(category)

        assert len(all_words) == len(set(all_words)), (
            "Found duplicate words across categories"
        )

    def test_specific_words_in_correct_categories(self) -> None:
        assert "furthermore" in TRANSITIONAL_STOP_WORDS
        assert "usually" in FREQUENCY_STOP_WORDS
        assert "comprehensive" in QUANTITATIVE_STOP_WORDS
        assert "methodological" in METHODOLOGICAL_STOP_WORDS
        assert "aspects" in ACADEMIC_FILLER_STOP_WORDS
        assert "cutting-edge" in GRANT_BUZZWORD_STOP_WORDS

    def test_academic_stop_words_size(self) -> None:
        assert len(ACADEMIC_STOP_WORDS) >= 50
        assert len(ACADEMIC_STOP_WORDS) <= 200
