from services.rag.src.utils.text_compression import (
    compress_repetitive_phrases,
    compress_text,
    compress_whitespace,
    estimate_compression_ratio,
)


class TestCompressRepetitivePhrases:
    def test_remove_duplicate_sentences(self) -> None:
        text = "This is important. This research matters. This is important. The work continues."
        result = compress_repetitive_phrases(text)
        sentences = result.split(". ")
        unique_sentences = {s.strip().lower() for s in sentences if s.strip()}
        assert len(unique_sentences) == len([s for s in sentences if s.strip()])

    def test_case_insensitive_deduplication(self) -> None:
        text = "This is IMPORTANT. this is important. This Is Important."
        result = compress_repetitive_phrases(text)
        sentences = [s.strip() for s in result.split(".") if s.strip()]
        assert len(sentences) == 1

    def test_preserve_order(self) -> None:
        text = "First sentence. Second sentence. First sentence. Third sentence."
        result = compress_repetitive_phrases(text)
        sentences = [s.strip() for s in result.split(".") if s.strip()]
        assert sentences[0] == "First sentence"
        assert sentences[1] == "Second sentence"
        assert sentences[2] == "Third sentence"

    def test_empty_text(self) -> None:
        assert compress_repetitive_phrases("") == ""

    def test_no_duplicates(self) -> None:
        text = "First sentence. Second sentence. Third sentence."
        result = compress_repetitive_phrases(text)
        assert result == text


class TestCompressWhitespace:
    def test_compress_multiple_spaces(self) -> None:
        text = "This   has    multiple     spaces"
        result = compress_whitespace(text)
        assert result == "This has multiple spaces"

    def test_compress_excessive_newlines(self) -> None:
        text = "Line 1\n\n\n\nLine 2\n\n\n\n\nLine 3"
        result = compress_whitespace(text)
        assert "\n\n\n" not in result
        import re

        assert not re.search(r"\n{3,}", result)

    def test_fix_double_periods(self) -> None:
        text = "This sentence ends.. Another sentence starts."
        result = compress_whitespace(text)
        assert ".." not in result
        assert result == "This sentence ends. Another sentence starts."

    def test_fix_double_commas(self) -> None:
        text = "Items: first,, second,, third"
        result = compress_whitespace(text)
        assert ",," not in result
        assert result == "Items: first, second, third"

    def test_strip_whitespace(self) -> None:
        text = "   Text with leading and trailing spaces   "
        result = compress_whitespace(text)
        assert result == "Text with leading and trailing spaces"

    def test_empty_text(self) -> None:
        assert compress_whitespace("") == ""
        assert compress_whitespace("   ") == ""


class TestCompressPromptText:
    def test_basic_compression(self) -> None:
        text = "The research methodology will comprehensively address various aspects. The research methodology will comprehensively address various aspects."
        result = compress_text(text, aggressive=False)
        assert len(result) < len(text)
        sentences = [s.strip() for s in result.split(".") if s.strip()]
        unique_sentences = {s.lower() for s in sentences}
        assert len(unique_sentences) == len(sentences)

    def test_aggressive_compression_short_text(self) -> None:
        text = "The research methodology will address various aspects of the study."
        result = compress_text(text, aggressive=True)
        assert "the" in result.lower()

    def test_aggressive_compression_long_text(self) -> None:
        text = " ".join(["The research methodology will comprehensively address various aspects."] * 100)
        result = compress_text(text, aggressive=True)
        assert len(result) < len(text)
        word_count_ratio = len(result.split()) / len(text.split())
        assert word_count_ratio < 0.8

    def test_compression_preserves_meaning(self) -> None:
        text = "This innovative research approach will utilize novel methodologies to comprehensively investigate protein interactions."
        result = compress_text(text, aggressive=True)
        assert "innovative" in result or "research" in result
        assert "protein" in result
        assert "interactions" in result

    def test_empty_text(self) -> None:
        assert compress_text("") == ""
        assert compress_text("   ") == ""

    def test_logging_reduction_calculation(self) -> None:
        text = "This is a sample text for testing compression ratios."
        result = compress_text(text, aggressive=False)
        assert isinstance(result, str)
        assert len(result) <= len(text)


class TestEstimateCompressionRatio:
    def test_high_repetition_text(self) -> None:
        text = "test test test test test test"
        ratio = estimate_compression_ratio(text)
        assert ratio < 0.5

    def test_unique_words_text(self) -> None:
        text = "research methodology analysis investigation evaluation assessment"
        ratio = estimate_compression_ratio(text)
        assert ratio > 0.8

    def test_empty_text(self) -> None:
        assert estimate_compression_ratio("") == 1.0

    def test_minimum_ratio_cap(self) -> None:
        text = "a a a a a a a a a a"
        ratio = estimate_compression_ratio(text)
        assert ratio >= 0.3


class TestIntegrationScenarios:
    def test_grant_application_content(self) -> None:
        text = """
        This comprehensive research methodology will systematically address various aspects
        of protein folding mechanisms. The innovative approach utilizes novel techniques to
        investigate molecular interactions. Furthermore, the methodology encompasses
        multiple experimental approaches. Additionally, the comprehensive framework
        addresses various research challenges. The research methodology will systematically
        address various aspects of protein folding mechanisms.
        """

        result = compress_text(text, aggressive=True)

        assert "protein" in result
        assert "folding" in result
        assert "molecular" in result
        assert "experimental" in result

        assert len(result) < len(text) * 0.9

    def test_technical_specifications_preservation(self) -> None:
        text = """
        The study design involves 500 participants across 12 sites. Statistical analysis
        will utilize SPSS version 28.0 with alpha=0.05. The methodology includes RT-PCR
        amplification using primers specific for exon 3-4 junction. Data collection spans
        24 months with interim analysis at month 12.
        """

        result = compress_text(text, aggressive=True)

        assert "500" in result
        assert "12" in result
        assert "28.0" in result
        assert "0.05" in result
        assert "RT-PCR" in result or ("RT" in result and "PCR" in result)
        assert "24" in result

    def test_scientific_terminology_preservation(self) -> None:
        text = """
        CRISPR-Cas9 genome editing technology enables precise modification of DNA sequences.
        The methodology involves guide RNA design targeting specific genomic loci.
        Electroporation parameters include 1200V, 20ms pulse duration, with 2x10^6 cells.
        """

        result = compress_text(text, aggressive=True)

        assert "CRISPR-Cas9" in result
        assert "genome" in result or "genomic" in result
        assert "RNA" in result
        assert "1200V" in result
        assert "20ms" in result
        assert "2x10^6" in result

    def test_compression_performance_large_text(self) -> None:
        base_text = """
        The comprehensive research methodology systematically addresses various aspects
        of molecular biology research. This innovative approach utilizes multiple
        experimental techniques to investigate cellular mechanisms.
        """
        large_text = base_text * 50

        result = compress_text(large_text, aggressive=True)

        compression_ratio = len(result) / len(large_text)
        assert compression_ratio < 0.7

        assert "molecular" in result
        assert "biology" in result
        assert "cellular" in result
