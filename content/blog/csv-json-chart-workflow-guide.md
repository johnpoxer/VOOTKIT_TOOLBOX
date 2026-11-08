---
title: "Inspect a CSV, Convert It to JSON and Create a Reliable Chart"
date: "2026-09-08"
description: "Check headers, quoting and numeric values before converting CSV or JSON and exporting a chart from Vootkit."
thumbnail: "/assets/blog/format-json-privately.jpg"
coverAlt: "Structured data illustrated in a browser workspace."
author: "The Vootkit team"
type: "Tutorial"
category: "Data"
tags: [Developer, Business, Tools]
relatedTools: [csv-viewer, json-csv, csv-to-chart, json-formatter]
---

A chart can render successfully while showing the wrong values. The mistake often starts earlier: a comma inside a number, a missing header, a duplicated column name or a conversion that turns every value into text.

For a small export, use a three-stage workflow: inspect the rows, convert only if necessary, and then chart a clearly labelled numeric column. Keep the source file unchanged until you have checked the final result.

## Start with a small, known example

Open [CSV Viewer & Sorter](/tools/data/csv-viewer/) and inspect a sample such as:

```csv
Month,Sales
Jan,120
Feb,180
Mar,90
Apr,240
```

There should be two columns and four data rows. The values total 630. February is 60 higher than January, and April is the highest month. These simple checks give you a known baseline before importing a larger file.

Check whether the first row really contains headings. If the file begins with a report title, notes or blank lines, prepare a clean copy with one header row followed by records.

## Understand delimiters and quotes

Vootkit's CSV parser handles comma-separated fields and quoted values, including commas inside quoted fields. For example, `"Smith, Ada",120` contains two fields, not three.

A file separated by semicolons or tabs is not the same input format. If everything appears in one column, inspect the separator rather than manually adding headings to the misread table.

Be careful with numbers such as `1,200`. Even if quoting keeps that value in one CSV cell, it is still text containing a comma. Prepare plain numeric chart values such as `1200` and put the currency or unit in the heading or accompanying explanation.

## Preserve identifiers as identifiers

Order numbers, postal codes and account references can look numeric while behaving as text. An identifier such as `00127` should not automatically become `127`.

Inspect the exported result in the receiving application. Some spreadsheet programs infer types when opening CSV files, regardless of how the file looked in a browser viewer. Choose text import settings for identifier columns where necessary.

If you are opening untrusted data in a spreadsheet, also consider whether cells beginning with formula characters might be interpreted as formulas. CSV conversion is not a formula-sanitisation feature.

## Convert to JSON with clear expectations

Use [JSON ↔ CSV](/tools/data/json-csv/) when the next system needs a different representation. Vootkit's CSV-to-JSON conversion creates one object per row using the header labels as keys. Values remain strings.

Thus a sales cell containing `120` becomes `"120"`, not the number `120`. A receiving API that expects numbers needs an explicit type-conversion step. Review the result with [JSON Formatter](/tools/developer/json-formatter/) and the receiving system's schema.

Use unique, meaningful headers. Duplicate headers can overwrite values in the resulting object because an object cannot keep two separate properties with the same key.

## Understand the reverse conversion

For JSON-to-CSV, start with an array of objects. Vootkit collects the property names into columns. Missing or null values become empty cells, while nested objects and arrays become JSON text inside cells.

That behaviour is useful for inspection, but it is not a fully reversible conversion. An empty string, a missing value and null can lose their distinction. Nested values are not automatically expanded into a relational table.

Test a record containing optional fields and nested data before converting a whole dataset. Compare the important fields after a round trip if you intend to convert back later.

## Choose a chart that answers one question

Open [CSV to Chart](/tools/data/csv-to-chart/) with the clean table. Select the label column and the numeric value column explicitly. A bar chart makes the four monthly values easy to compare; a line chart emphasises their sequence.

The current tool offers bar, line, pie and doughnut charts and a PNG download. A pie chart is useful only when the values represent meaningful parts of a whole. Do not use one simply because it looks more colourful.

The chart uses numeric parsing rather than a full data-cleaning engine. Text beginning with a number can be partially interpreted, so inspect the source values yourself. Remove currency symbols and thousands separators in a deliberate preparation step, preserving the meaning of decimals and negatives.

## Check the export, not just the preview

Before downloading, compare the highest and lowest values with the source. Confirm the labels are in the intended order. A line chart does not automatically know the chronological order of text labels.

Open the PNG after export. Check text size, clipped labels and the meaning of the units. Keep the underlying CSV beside it so another person can inspect the numbers; a chart image alone is not an accessible data table.

### Can this handle an unlimited CSV?

No. Browser memory and interface responsiveness impose practical limits. Try a representative subset before loading a very large export.

### Why did my JSON numbers become strings?

The CSV-to-JSON conversion preserves cell text. Apply types according to the destination's schema rather than guessing from appearances.

### Does a rendered chart prove the data is clean?

No. Validate the headers, units, row count and several known values. Rendering confirms that the charting code accepted the input, not that the input was correct.
