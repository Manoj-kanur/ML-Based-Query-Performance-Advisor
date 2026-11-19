"""
High-Impact 10-Slide Presentation Deck Generator for PES University DBMS Mini-Project.
Generates presentation.pptx (16:9 widescreen, Bento Grid style, Deep Graphite + Soft Cloud White + Lime Yellow)
and exports to crystal-clear presentation.pdf using PowerPoint COM automation.
"""

import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# Theme Colors (60:30:10 rule)
C_BG = RGBColor(18, 21, 27)         # 60% Deep Graphite canvas (#12151B)
C_CARD = RGBColor(26, 31, 40)       # 60% Bento card surface (#1A1F28)
C_BORDER = RGBColor(46, 54, 70)     # Subtle card border (#2E3646)
C_TEXT_MAIN = RGBColor(248, 250, 252) # 30% Soft Cloud White headings (#F8FAFC)
C_TEXT_SUB = RGBColor(166, 178, 192)  # 30% Soft Cloud White body (#A6B2C0)
C_TEXT_MUTED = RGBColor(118, 131, 148)# 30% Muted labels (#768394)
C_ACCENT = RGBColor(204, 255, 0)    # 10% Lime Yellow accent (#CCFF00)
C_BLUE = RGBColor(56, 189, 248)     # Accent blue (#38BDF8)
C_GREEN = RGBColor(52, 211, 153)    # Accent green (#34D399)
C_RED = RGBColor(248, 113, 113)     # Accent red (#F87171)

FONT_HEAD = "Segoe UI"
FONT_BODY = "Segoe UI"
FONT_MONO = "Consolas"

def create_slide(prs):
    """Adds a blank slide with deep graphite background."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = C_BG
    return slide

def add_header(slide, tag_text, title_text):
    """Adds standardized slide header banner with pill tag and accent underline."""
    # Tag Pill
    tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(8.0), Inches(0.35))
    tf_tag = tag_box.text_frame
    tf_tag.word_wrap = True
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = tag_text.upper()
    p_tag.font.name = FONT_MONO
    p_tag.font.size = Pt(10)
    p_tag.font.bold = True
    p_tag.font.color.rgb = C_ACCENT
    
    # Title
    t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.7))
    tf = t_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = title_text
    p.font.name = FONT_HEAD
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_MAIN
    
    # Accent Underline
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.45), Inches(11.733), Inches(0.02))
    line.fill.solid()
    line.fill.fore_color.rgb = C_BORDER
    line.line.color.rgb = C_BORDER

def add_footer(slide, current_slide, total_slides=10):
    """Adds bottom telemetry footer across slides."""
    f_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(11.733), Inches(0.3))
    tf = f_box.text_frame
    p = tf.paragraphs[0]
    p.text = f"PES UNIVERSITY · UE23CS351A DBMS MINI-PROJECT          K R Manoj (AM125) & K Ravish Rao (AM127)          SLIDE {current_slide} OF {total_slides}"
    p.font.name = FONT_MONO
    p.font.size = Pt(9)
    p.font.color.rgb = C_TEXT_MUTED

def add_card(slide, left, top, width, height, bg_color=C_CARD, border_color=C_BORDER):
    """Creates a rounded Bento container card."""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    card.line.color.rgb = border_color
    card.line.width = Pt(1)
    return card

def build_presentation(pptx_path, pdf_path):
    print("Initializing 16:9 widescreen presentation...")
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # =========================================================================
    # SLIDE 1: TITLE SLIDE (HERO BENTO)
    # =========================================================================
    s1 = create_slide(prs)
    
    # Main hero card
    add_card(s1, Inches(0.8), Inches(0.8), Inches(11.733), Inches(5.9))
    
    # Pill Tag
    tb = s1.shapes.add_textbox(Inches(1.2), Inches(1.1), Inches(8), Inches(0.4))
    p = tb.text_frame.paragraphs[0]
    p.text = "DATABASE MANAGEMENT SYSTEMS (DBMS) · UE23CS351A · 5TH SEMESTER"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT

    # Main Project Title
    tb = s1.shapes.add_textbox(Inches(1.2), Inches(1.5), Inches(10.9), Inches(1.5))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "ML-Based Query Performance Advisor for Relational Databases"
    p.font.name = FONT_HEAD
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_MAIN
    
    # Subtitle
    tb = s1.shapes.add_textbox(Inches(1.2), Inches(2.9), Inches(10.9), Inches(0.8))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Automated Query Latency Prediction, Execution Bottleneck Diagnosis & Missing Index Recommendation"
    p.font.name = FONT_HEAD
    p.font.size = Pt(16)
    p.font.color.rgb = C_BLUE

    # Team Members Box (Left Inner Bento)
    add_card(s1, Inches(1.2), Inches(3.8), Inches(5.2), Inches(2.5), bg_color=RGBColor(21, 25, 33))
    tb = s1.shapes.add_textbox(Inches(1.4), Inches(3.9), Inches(4.8), Inches(2.3))
    tf = tb.text_frame
    
    p = tf.paragraphs[0]
    p.text = "PROJECT TEAM (SECTION C):"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT
    
    p2 = tf.add_paragraph()
    p2.text = "• K R Manoj  (PES1UG24AM125)"
    p2.font.name = FONT_HEAD
    p2.font.size = Pt(13)
    p2.font.bold = True
    p2.font.color.rgb = C_TEXT_MAIN
    
    p3 = tf.add_paragraph()
    p3.text = "• K Ravish Rao  (PES1UG24AM127)"
    p3.font.name = FONT_HEAD
    p3.font.size = Pt(13)
    p3.font.bold = True
    p3.font.color.rgb = C_TEXT_MAIN

    p4 = tf.add_paragraph()
    p4.text = "Department of Computer Science & Engineering (AI & ML)\nPES University, Bengaluru"
    p4.font.name = FONT_HEAD
    p4.font.size = Pt(10.5)
    p4.font.color.rgb = C_TEXT_SUB

    # Tech Stack Badges Box (Right Inner Bento)
    add_card(s1, Inches(6.7), Inches(3.8), Inches(5.4), Inches(2.5), bg_color=RGBColor(21, 25, 33))
    tb = s1.shapes.add_textbox(Inches(6.9), Inches(3.9), Inches(5.0), Inches(2.3))
    tf = tb.text_frame
    
    p = tf.paragraphs[0]
    p.text = "SYSTEM ARCHITECTURE HIGHLIGHTS:"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT
    
    items = [
        "• Primary RDBMS: PostgreSQL 16 (TPC-H SF=1 Workloads)",
        "• Document Store & Auth: MongoDB 7.0 + bcrypt (10 rounds)",
        "• ML Predictive Core: XGBoost Regressor (R² = 0.9715, RMSE = 15.35 ms)",
        "• Index Recommender: AST Scan Predicate Synthesizer (2.5x - 18x)",
        "• Developer UI: Next.js 14 Bento Grid (60:30:10 Palette & SQL Mono)",
    ]
    for item in items:
        pi = tf.add_paragraph()
        pi.text = item
        pi.font.name = FONT_HEAD
        pi.font.size = Pt(10.5)
        pi.font.color.rgb = C_TEXT_SUB

    # =========================================================================
    # SLIDE 2: PROBLEM STATEMENT & MOTIVATION
    # =========================================================================
    s2 = create_slide(prs)
    add_header(s2, "Motivation & Problem Definition", "The Query Performance Tuning Dilemma in Modern Databases")
    add_footer(s2, 2)

    # 3 Asymmetrical Bento Cards
    add_card(s2, Inches(0.8), Inches(1.7), Inches(3.7), Inches(4.0))
    tb = s2.shapes.add_textbox(Inches(1.0), Inches(1.9), Inches(3.3), Inches(3.6))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "1. Production Bottlenecks"
    p.font.name = FONT_HEAD
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_RED
    
    p2 = tf.add_paragraph()
    p2.text = (
        "\n• Over 80% of persistent relational database slowdowns stem from unindexed sequential scans (Seq Scan).\n\n"
        "• Full disk scans traverse millions of 8KB table pages, saturating CPU cycles and exhausting disk I/O buffers.\n\n"
        "• Inefficient queries degrade overall multi-tenant throughput."
    )
    p2.font.name = FONT_HEAD
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_SUB

    add_card(s2, Inches(4.8), Inches(1.7), Inches(3.7), Inches(4.0))
    tb = s2.shapes.add_textbox(Inches(5.0), Inches(1.9), Inches(3.3), Inches(3.6))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "2. The DBA Expertise Gap"
    p.font.name = FONT_HEAD
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_BLUE
    
    p2 = tf.add_paragraph()
    p2.text = (
        "\n• Diagnosing query slowness requires executing EXPLAIN (ANALYZE, BUFFERS) and manually reading verbose JSON trees.\n\n"
        "• Application developers write business SQL, but lack deep DBA heuristics to recognize missing index opportunities.\n\n"
        "• Manual tuning is slow, error-prone, and reactive."
    )
    p2.font.name = FONT_HEAD
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_SUB

    add_card(s2, Inches(8.8), Inches(1.7), Inches(3.7), Inches(4.0))
    tb = s2.shapes.add_textbox(Inches(9.0), Inches(1.9), Inches(3.3), Inches(3.6))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "3. Cost Model Shortcomings"
    p.font.name = FONT_HEAD
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT
    
    p2 = tf.add_paragraph()
    p2.text = (
        "\n• Traditional PostgreSQL cost-based optimizers output abstract, unitless cost numbers—not wall-clock latency (ms).\n\n"
        "• Static mathematical heuristics assume uniform data distribution, mispredicting time under buffer contention and data skew.\n\n"
        "• Machine Learning provides empirical, calibrated predictions."
    )
    p2.font.name = FONT_HEAD
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_SUB

    # Bottom Solution Banner
    add_card(s2, Inches(0.8), Inches(5.9), Inches(11.733), Inches(0.9), bg_color=RGBColor(21, 25, 33), border_color=C_ACCENT)
    tb = s2.shapes.add_textbox(Inches(1.0), Inches(5.95), Inches(11.333), Inches(0.8))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = "OUR SOLUTION: AN ML-DRIVEN QUERY PERFORMANCE ADVISOR"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT
    p2 = tf.add_paragraph()
    p2.text = "Parses execution plans via DFS (22 features), predicts latency via XGBoost (R² = 0.9715), and synthesizes exact CREATE INDEX statements yielding 2.5x to 18x speedups."
    p2.font.name = FONT_HEAD
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_TEXT_MAIN

    # =========================================================================
    # SLIDE 3: SYSTEM ARCHITECTURE & DUAL-DATABASE PIPELINE
    # =========================================================================
    s3 = create_slide(prs)
    add_header(s3, "System Architecture", "End-to-End Dual-Database Pipeline & Microservices Flow")
    add_footer(s3, 3)

    # 4 Vertical Pipeline Bento Columns
    cols_data = [
        ("1. RDBMS Workload", C_BLUE, [
            "• PostgreSQL 16 Engine",
            "• TPC-H SF=1 Workload (22 standard queries)",
            "• E-Commerce transactional schema (orders, customers)",
            "• Real-time query execution & buffer telemetry capture",
        ]),
        ("2. Plan Parser", C_ACCENT, [
            "• Recursive DFS Plan Parser",
            "• Flattens nested JSON execution trees",
            "• Extracts 22 quantitative features (cost ratios, row variances, buffer hit rates)",
            "• Identifies root operator and filter predicates",
        ]),
        ("3. ML Engine & Rules", C_GREEN, [
            "• Pre-trained XGBoost Regressor (Latency in ms)",
            "• XGBoost Classifier (SLA violation detection)",
            "• AST Predicate Recommender: synthesizes CREATE INDEX DDL",
            "• Speedup estimator (2.5x to 18x)",
        ]),
        ("4. NoSQL & Web UI", C_TEXT_MAIN, [
            "• MongoDB 7.0 Document Store (BSON plan trees)",
            "• bcrypt authentication & 3-tier RBAC",
            "• FastAPI Asynchronous REST endpoints",
            "• Next.js 14 Bento Grid Interface (60:30:10 theme)",
        ]),
    ]

    for idx, (col_title, title_color, bullets) in enumerate(cols_data):
        left_pos = Inches(0.8 + idx * 3.0)
        add_card(s3, left_pos, Inches(1.7), Inches(2.8), Inches(4.0))
        tb = s3.shapes.add_textbox(left_pos + Inches(0.15), Inches(1.85), Inches(2.5), Inches(3.7))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = col_title
        p.font.name = FONT_HEAD
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = title_color
        
        for b in bullets:
            pb = tf.add_paragraph()
            pb.text = b
            pb.font.name = FONT_HEAD
            pb.font.size = Pt(10.5)
            pb.font.color.rgb = C_TEXT_SUB

    # Bottom Inter-Service Flow Banner
    add_card(s3, Inches(0.8), Inches(5.9), Inches(11.733), Inches(0.9), bg_color=RGBColor(21, 25, 33))
    tb = s3.shapes.add_textbox(Inches(1.0), Inches(5.95), Inches(11.333), Inches(0.8))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = "DATA FLOW & MICROSERVICES ORCHESTRATION"
    p.font.name = FONT_MONO
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT
    p2 = tf.add_paragraph()
    p2.text = "Developer submits SQL  ──>  FastAPI calls EXPLAIN  ──>  DFS parses features  ──>  XGBoost predicts ms  ──>  AST outputs CREATE INDEX  ──>  MongoDB persists report  ──>  Next.js renders Bento UI"
    p2.font.name = FONT_MONO
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = C_BLUE

    # =========================================================================
    # SLIDE 4: DATABASE DESIGN (ER MODEL & 3NF SCHEMA)
    # =========================================================================
    s4 = create_slide(prs)
    add_header(s4, "Database Design & Modeling", "Conceptual E-R Model, Weak Entities & 3NF Relational Schemas")
    add_footer(s4, 4)

    # Left Bento: Entity Breakdown & Classification
    add_card(s4, Inches(0.8), Inches(1.7), Inches(5.0), Inches(5.1))
    tb = s4.shapes.add_textbox(Inches(1.0), Inches(1.85), Inches(4.6), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "E-R DESIGN SPECIFICATION"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT
    
    details = [
        ("• Strong Entities:", "USER, QUERY_LOG, EXECUTION_PLAN, RECOMMENDATION, CUSTOMER, ORDER, PRODUCT."),
        ("• WEAK ENTITY (Crucial):", "ORDER_ITEM is a Weak Entity dependent on ORDER. It lacks an independent PK; its identity is formed by composite PK (order_id, item_id)."),
        ("• Non-Simple Attributes:", "Composite: Customer_Name(first, last), Address(street, city, zip). Multivalued: Target_Columns, Roles. Derived: Speedup_Ratio, Line_Total."),
        ("• Associative Relations (Not in ER):", "order_items (resolves M:N and weak entity), plan_feature_vector (maps attributions), user_audit_log (session history)."),
        ("• Integrity Constraints:", "FOREIGN KEY ... ON DELETE CASCADE, CHECK (total_amount >= 0), CHECK (balance >= -5000), UNIQUE (email)."),
    ]
    for title, desc in details:
        pt = tf.add_paragraph()
        pt.text = title
        pt.font.name = FONT_HEAD
        pt.font.size = Pt(11)
        pt.font.bold = True
        pt.font.color.rgb = C_TEXT_MAIN
        pd = tf.add_paragraph()
        pd.text = desc
        pd.font.name = FONT_HEAD
        pd.font.size = Pt(10)
        pd.font.color.rgb = C_TEXT_SUB

    # Right Bento: Embedded Relational Schema Diagram
    add_card(s4, Inches(6.0), Inches(1.7), Inches(6.533), Inches(5.1))
    if os.path.exists("docs/images/schema_diagram.png"):
        s4.shapes.add_picture("docs/images/schema_diagram.png", Inches(6.15), Inches(1.85), Inches(6.233), Inches(4.8))

    # =========================================================================
    # SLIDE 5: ADVANCED DATABASE CONCEPTS & SQL SUITE
    # =========================================================================
    s5 = create_slide(prs)
    add_header(s5, "Advanced SQL Concepts", "Complex Joins, Subqueries, Recursive CTEs, Procedures & Triggers")
    add_footer(s5, 5)

    adv_cards = [
        ("1. Multi-Table Analytical Join", C_BLUE, (
            "SELECT c.customer_id, full_name, c.city,\n"
            "       SUM(oi.quantity * oi.unit_price * (1 - oi.discount)) AS CLV\n"
            "FROM customers c\n"
            "INNER JOIN orders o ON c.customer_id = o.customer_id\n"
            "INNER JOIN order_items oi ON o.order_id = oi.order_id\n"
            "INNER JOIN products p ON oi.product_id = p.product_id\n"
            "GROUP BY c.customer_id, full_name, c.city\n"
            "ORDER BY CLV DESC;"
        ), "Computes Customer Lifetime Value across 4 relations with aggregation."),
        
        ("2. Correlated & Nested Subqueries", C_GREEN, (
            "SELECT o.order_id, o.customer_id, o.total_amount\n"
            "FROM orders o\n"
            "WHERE o.total_amount > (\n"
            "    SELECT AVG(o2.total_amount)\n"
            "    FROM orders o2\n"
            "    WHERE o2.customer_id = o.customer_id\n"
            ");"
        ), "Identifies high-value orders exceeding the customer's personal average."),
        
        ("3. Recursive Common Table Expression", C_ACCENT, (
            "WITH RECURSIVE CategoryHierarchy AS (\n"
            "    SELECT category_id, name, parent_id, 1 AS depth\n"
            "    FROM categories WHERE parent_id IS NULL\n"
            "    UNION ALL\n"
            "    SELECT c.category_id, c.name, c.parent_id, ch.depth + 1\n"
            "    FROM categories c\n"
            "    JOIN CategoryHierarchy ch ON c.parent_id = ch.category_id\n"
            ")\n"
            "SELECT * FROM CategoryHierarchy;"
        ), "Traverses arbitrary-depth hierarchical product catalog trees."),
        
        ("4. Stored Procedures & Triggers", C_TEXT_MAIN, (
            "CREATE OR REPLACE FUNCTION trg_audit_order_update()\n"
            "RETURNS TRIGGER AS $$\n"
            "BEGIN\n"
            "    NEW.updated_at = CURRENT_TIMESTAMP;\n"
            "    INSERT INTO order_audit_log VALUES (OLD.order_id, ...);\n"
            "    RETURN NEW;\n"
            "END; $$ LANGUAGE plpgsql;\n"
            "CREATE TRIGGER trg_order_audit ...;"
        ), "Automated order timestamp update & state audit logging trigger."),
    ]

    for idx, (title, color, code_snip, expl) in enumerate(adv_cards):
        col_i = idx % 2
        row_i = idx // 2
        l = Inches(0.8 + col_i * 5.95)
        t = Inches(1.7 + row_i * 2.6)
        
        add_card(s5, l, t, Inches(5.75), Inches(2.45))
        tb = s5.shapes.add_textbox(l + Inches(0.15), t + Inches(0.1), Inches(5.45), Inches(2.25))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_HEAD
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = color
        
        p_code = tf.add_paragraph()
        p_code.text = code_snip
        p_code.font.name = FONT_MONO
        p_code.font.size = Pt(8.5)
        p_code.font.color.rgb = RGBColor(226, 232, 240)
        
        p_exp = tf.add_paragraph()
        p_exp.text = "• " + expl
        p_exp.font.name = FONT_HEAD
        p_exp.font.size = Pt(9.5)
        p_exp.font.color.rgb = C_TEXT_MUTED

    # =========================================================================
    # SLIDE 6: NOSQL (MONGODB) INTEGRATION & RBAC SECURITY
    # =========================================================================
    s6 = create_slide(prs)
    add_header(s6, "NoSQL Integration & Security", "MongoDB Document Store, Aggregations & Role-Based Access Control")
    add_footer(s6, 6)

    # Left Bento: Why NoSQL & Aggregations
    add_card(s6, Inches(0.8), Inches(1.7), Inches(5.7), Inches(5.1))
    tb = s6.shapes.add_textbox(Inches(1.0), Inches(1.85), Inches(5.3), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "WHY MONGODB FOR EXECUTION PLANS?"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT
    
    reasons = [
        ("• Relational Impedance Mismatch:", "PostgreSQL execution plans are recursive JSON trees with variable operator nodes. Normalizing into relational tables requires excessive recursive joins; MongoDB stores complete plans natively as single BSON documents."),
        ("• Dynamic Schema Flexibility:", "Accommodates varying PostgreSQL version features (Shared Hit Blocks, Sort Space) without requiring ALTER TABLE schema migrations."),
        ("• Multi-Stage Aggregation Pipeline:", "db.query_analysis_reports.aggregate([\n  { $match: { is_slow: true } },\n  { $group: { _id: '$plan_tree.Node Type', avg_latency: { $avg: '$predicted_ms' }, max_speedup: { $max: '$speedup_ratio' } } },\n  { $sort: { avg_latency: -1 } }\n])"),
        ("• Subdocument Indexing:", "Rapid indexing on query_hash, user_id, and nested operator fields."),
    ]
    for r_title, r_desc in reasons:
        pt = tf.add_paragraph()
        pt.text = r_title
        pt.font.name = FONT_HEAD
        pt.font.size = Pt(11)
        pt.font.bold = True
        pt.font.color.rgb = C_TEXT_MAIN
        pd = tf.add_paragraph()
        pd.text = r_desc
        pd.font.name = FONT_MONO if "aggregate" in r_desc else FONT_HEAD
        pd.font.size = Pt(8.5) if "aggregate" in r_desc else Pt(10)
        pd.font.color.rgb = C_TEXT_SUB

    # Right Bento: RBAC Matrix & bcrypt Auth
    add_card(s6, Inches(6.8), Inches(1.7), Inches(5.733), Inches(5.1))
    tb = s6.shapes.add_textbox(Inches(7.0), Inches(1.85), Inches(5.333), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "ROLE-BASED ACCESS CONTROL (RBAC) & GATING"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT

    p_bcrypt = tf.add_paragraph()
    p_bcrypt.text = (
        "• Cryptographic Password Security:\n"
        "  User credentials are salted and hashed using bcrypt (10 rounds) in the users collection. Passwords are never stored in plain text.\n"
    )
    p_bcrypt.font.name = FONT_HEAD
    p_bcrypt.font.size = Pt(10)
    p_bcrypt.font.color.rgb = C_TEXT_SUB

    p_table = tf.add_paragraph()
    p_table.text = "THREE-TIER SECURITY PERMISSION MATRIX:"
    p_table.font.name = FONT_MONO
    p_table.font.size = Pt(10.5)
    p_table.font.bold = True
    p_table.font.color.rgb = C_BLUE

    matrix = [
        "1. Guest Mode (Unauthenticated):\n   • Basic query latency prediction & FAST/SLOW classification (Free Tier)\n   • Index DDL & Plan Trees LOCKED behind unclipped login card",
        "2. Developer Role (MongoDB Auth):\n   • Unlocks exact CREATE INDEX statements & speedup multipliers\n   • Unlocks full interactive execution plan tree JSON & query rewrites",
        "3. Administrator Role (MongoDB Auth):\n   • Full platform access, retrain model triggers, workload telemetry auditing",
    ]
    for m in matrix:
        pm = tf.add_paragraph()
        pm.text = m
        pm.font.name = FONT_HEAD
        pm.font.size = Pt(9.5)
        pm.font.color.rgb = C_TEXT_SUB

    # =========================================================================
    # SLIDE 7: MACHINE LEARNING ENGINE & FEATURE ENGINEERING
    # =========================================================================
    s7 = create_slide(prs)
    add_header(s7, "Machine Learning Inference", "Gradient-Boosted Trees, Feature Engineering & Benchmark Metrics")
    add_footer(s7, 7)

    # Left Bento: 22 DFS Quantitative Features
    add_card(s7, Inches(0.8), Inches(1.7), Inches(5.2), Inches(5.1))
    tb = s7.shapes.add_textbox(Inches(1.0), Inches(1.85), Inches(4.8), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "22 DFS QUANTITATIVE PLAN FEATURES"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT
    
    feats = [
        ("• Tree Topology:", "Tree Depth, Total Node Count, Seq Scan Count, Index Scan Count, Hash Join Count, Merge Join Count, Aggregate Count."),
        ("• Cost & Cardinality Telemetry:", "Total Cost, Startup Cost, Cost Ratio (Total/Startup), Estimated Plan Rows, Rows Variance Ratio (Plan vs Actual Rows)."),
        ("• Memory & Buffer Telemetry:", "Shared Hit Blocks, Shared Read Blocks, Shared Dirtied Blocks, Buffer Cache Miss Ratio, Disk I/O Block Traversals."),
        ("• Scan & Filter Flags:", "has_filter_without_index (boolean flag indicating missing index bottleneck), Table Cardinality Size Tier, Filter Predicate Selectivity."),
    ]
    for f_title, f_desc in feats:
        pt = tf.add_paragraph()
        pt.text = f_title
        pt.font.name = FONT_HEAD
        pt.font.size = Pt(11)
        pt.font.bold = True
        pt.font.color.rgb = C_TEXT_MAIN
        pd = tf.add_paragraph()
        pd.text = f_desc
        pd.font.name = FONT_HEAD
        pd.font.size = Pt(10)
        pd.font.color.rgb = C_TEXT_SUB

    # Right Bento: Model Evaluation Table & SHAP Importance
    add_card(s7, Inches(6.3), Inches(1.7), Inches(6.233), Inches(5.1))
    tb = s7.shapes.add_textbox(Inches(6.5), Inches(1.85), Inches(5.833), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "MODEL BENCHMARK RESULTS (1,500 PLANS DATASET)"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT

    results = [
        "• XGBoost Regressor (Primary): R² = 0.9715, RMSE = 15.35 ms, MAE = 9.82 ms\n  (Superior handling of non-linear operator cardinality interactions)",
        "• LightGBM Regressor: R² = 0.9715, RMSE = 15.36 ms, MAE = 9.85 ms\n  (Ultra-fast leaf-wise tree splitting)",
        "• Random Forest Regressor: R² = 0.9521, RMSE = 19.80 ms, MAE = 12.40 ms\n  (Robust baseline, non-GPU)",
        "• Ridge Linear Baseline: R² = 0.8120, RMSE = 48.20 ms (Severe underfitting)",
        "• XGBoost Classifier (SLA Breach > 50 ms): Accuracy = 100%, Precision = 1.0, Recall = 1.0, AUC = 1.0",
    ]
    for r in results:
        pr = tf.add_paragraph()
        pr.text = r
        pr.font.name = FONT_HEAD
        pr.font.size = Pt(10)
        pr.font.color.rgb = C_GREEN if "XGBoost Regressor" in r or "100%" in r else C_TEXT_SUB

    p_shap = tf.add_paragraph()
    p_shap.text = "\nSHAP ATTRIBUTION INSIGHTS:"
    p_shap.font.name = FONT_MONO
    p_shap.font.size = Pt(10.5)
    p_shap.font.bold = True
    p_shap.font.color.rgb = C_BLUE

    p_shd = tf.add_paragraph()
    p_shd.text = "Total Cost (38.4%), Plan Rows (22.1%), Shared Read Blocks (14.2%), and has_filter_without_index (11.5%) drive 86.2% of total latency variation."
    p_shd.font.name = FONT_HEAD
    p_shd.font.size = Pt(9.5)
    p_shd.font.color.rgb = C_TEXT_SUB

    # =========================================================================
    # SLIDE 8: RECOMMENDATION ENGINE & SPEEDUP VALIDATION
    # =========================================================================
    s8 = create_slide(prs)
    add_header(s8, "Missing Index Synthesis", "AST Predicate Analysis, DDL Synthesis & Empirical Speedup Validation")
    add_footer(s8, 8)

    # Left Bento: Rule-Assisted Recommender Algorithm
    add_card(s8, Inches(0.8), Inches(1.7), Inches(5.2), Inches(5.1))
    tb = s8.shapes.add_textbox(Inches(1.0), Inches(1.85), Inches(4.8), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "AST RECOMMENDER ALGORITHM"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT

    steps = [
        "1. Bottleneck Detection:\n   Scans execution plan tree for Seq Scan nodes with high plan rows (> 500) and substantial Total Cost.",
        "2. AST Predicate Extraction:\n   Parses SQL Filter expressions (e.g. (total_amount > 500) AND (status = 'PENDING')) to extract target filter columns.",
        "3. DDL Synthesis:\n   Generates valid PostgreSQL DDL:\n   CREATE INDEX idx_orders_total_amount ON orders(total_amount);",
        "4. Cost-Benefit Validation:\n   Re-simulates query execution plan with candidate index to verify that the planner selects an Index Scan and estimates speedup.",
        "5. Optimal Query Guard:\n   Queries already using Index Scans (e.g. PK lookups at 0.44 ms) return 1.0x (Optimal) without suggesting redundant indexes.",
    ]
    for s in steps:
        ps = tf.add_paragraph()
        ps.text = s
        ps.font.name = FONT_HEAD
        ps.font.size = Pt(9.5)
        ps.font.color.rgb = C_TEXT_SUB

    # Right Bento: Embedded Benchmark Results Chart
    add_card(s8, Inches(6.3), Inches(1.7), Inches(6.233), Inches(5.1))
    if os.path.exists("docs/images/benchmark_results.png"):
        s8.shapes.add_picture("docs/images/benchmark_results.png", Inches(6.45), Inches(1.85), Inches(5.933), Inches(4.8))

    # =========================================================================
    # SLIDE 9: BENTO GRID DEVELOPER UI & DEMO WALKTHROUGH
    # =========================================================================
    s9 = create_slide(prs)
    add_header(s9, "Developer Experience", "Next.js 14 Bento Grid Interface, Monospace Theme & Live Walkthrough")
    add_footer(s9, 9)

    # Left Bento: Bento Grid Design System & Features
    add_card(s9, Inches(0.8), Inches(1.7), Inches(4.8), Inches(5.1))
    tb = s9.shapes.add_textbox(Inches(1.0), Inches(1.85), Inches(4.4), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "BENTO GRID DESIGN SYSTEM (60:30:10)"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT

    ui_points = [
        ("• 60% Deep Graphite:", "Canvas (#121316) and Bento card containers (#181B1F) create an elevated, distraction-free console."),
        ("• 30% Soft Cloud White:", "Headings (#F8FAFC) and body text (#A6B2C0) provide high-contrast readability without eye strain."),
        ("• 10% Lime Yellow Accent:", "Targeted strictly for high-impact regions: Primary 'Analyze' CTA button, active tabs, and speedup badges."),
        ("• Monospace Typography:", "Global monospace SQL typeface matching developer code editors across all cards, KPIs, and inputs."),
        ("• Live Demo Flow:", "1. Select benchmark preset (e.g. orders WHERE total_amount > 500)\n2. Inspect predicted 248.5 ms & SLOW verdict\n3. View locked card in Guest mode\n4. 1-Click MongoDB Login (pes_demo)\n5. Unlock CREATE INDEX DDL with 17.5x speedup!"),
    ]
    for u_title, u_desc in ui_points:
        pt = tf.add_paragraph()
        pt.text = u_title
        pt.font.name = FONT_HEAD
        pt.font.size = Pt(10.5)
        pt.font.bold = True
        pt.font.color.rgb = C_TEXT_MAIN
        pd = tf.add_paragraph()
        pd.text = u_desc
        pd.font.name = FONT_HEAD
        pd.font.size = Pt(9.5)
        pd.font.color.rgb = C_TEXT_SUB

    # Right Bento: Embedded UI Demo Screenshot
    add_card(s9, Inches(5.9), Inches(1.7), Inches(6.633), Inches(5.1))
    if os.path.exists("docs/images/ui_demo_screenshot.png"):
        s9.shapes.add_picture("docs/images/ui_demo_screenshot.png", Inches(6.05), Inches(1.85), Inches(6.333), Inches(4.8))

    # =========================================================================
    # SLIDE 10: CONCLUSION, RUBRICS & FUTURE ROADMAP
    # =========================================================================
    s10 = create_slide(prs)
    add_header(s10, "Summary & Evaluation", "Rubrics Completion Status, Key Achievements & Future Roadmap")
    add_footer(s10, 10)

    # Left Bento: Rubrics Matrix (100% Completed)
    add_card(s10, Inches(0.8), Inches(1.7), Inches(5.7), Inches(5.1))
    tb = s10.shapes.add_textbox(Inches(1.0), Inches(1.85), Inches(5.3), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "EVALUATION RUBRICS COMPLETION (100%)"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT

    rubrics = [
        "1. Database Design (ER, Weak Entity, 3NF Keys)  ──>  100% COMPLETE",
        "2. Database Creation (PostgreSQL DDL, MongoDB)    ──>  100% COMPLETE",
        "3. SQL Queries (4-Table Join, Subqueries, CTE)    ──>  100% COMPLETE",
        "4. Advanced Concepts (PL/pgSQL, Trigger, Pipeline) ──>  100% COMPLETE",
        "5. Web App & Integration (Next.js 14, FastAPI)   ──>  100% COMPLETE",
        "6. Authentication & RBAC (MongoDB bcrypt 10r)     ──>  100% COMPLETE",
        "7. Testing & Git (14/14 Pytest passed, GitHub)    ──>  100% COMPLETE",
    ]
    for r in rubrics:
        pr = tf.add_paragraph()
        pr.text = r
        pr.font.name = FONT_MONO
        pr.font.size = Pt(9.5)
        pr.font.color.rgb = C_GREEN

    p_test = tf.add_paragraph()
    p_test.text = "\nTEST SUITE SUMMARY:"
    p_test.font.name = FONT_MONO
    p_test.font.size = Pt(10)
    p_test.font.bold = True
    p_test.font.color.rgb = C_BLUE

    p_td = tf.add_paragraph()
    p_td.text = "14/14 Pytest unit & integration tests passing cleanly across plan parser, ML registry, AST recommender, MongoDB auth, and REST API endpoints."
    p_td.font.name = FONT_HEAD
    p_td.font.size = Pt(9.5)
    p_td.font.color.rgb = C_TEXT_SUB

    # Right Bento: Project Takeaways & Q&A
    add_card(s10, Inches(6.8), Inches(1.7), Inches(5.733), Inches(5.1))
    tb = s10.shapes.add_textbox(Inches(7.0), Inches(1.85), Inches(5.333), Inches(4.8))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p = tf.paragraphs[0]
    p.text = "PROJECT IMPACT & FUTURE ROADMAP"
    p.font.name = FONT_MONO
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_ACCENT

    takeaways = [
        ("• Bridging Academic Theory & ML Practice:", "Combined formal relational algebra and indexing theory with gradient-boosted trees to replace unitless cost estimates with empirical latency."),
        ("• Production Dual-Database Architecture:", "PostgreSQL handles transactional workloads while MongoDB eliminates JSON tree normalization overhead and manages secure multi-role access."),
        ("• Verified Performance Multipliers:", "Empirically validated query acceleration ranging from 2.5x to 18x across selective and join workloads."),
        ("• Future Enhancements:", "Composite partitioning advisor, automated VACUUM triggers, distributed database support (CockroachDB/Citus), and cloud Kubernetes deployment."),
    ]
    for t_title, t_desc in takeaways:
        pt = tf.add_paragraph()
        pt.text = t_title
        pt.font.name = FONT_HEAD
        pt.font.size = Pt(11)
        pt.font.bold = True
        pt.font.color.rgb = C_TEXT_MAIN
        pd = tf.add_paragraph()
        pd.text = t_desc
        pd.font.name = FONT_HEAD
        pd.font.size = Pt(9.5)
        pd.font.color.rgb = C_TEXT_SUB

    p_qa = tf.add_paragraph()
    p_qa.text = "\nTHANK YOU! QUESTIONS & FEEDBACK"
    p_qa.font.name = FONT_HEAD
    p_qa.font.size = Pt(14)
    p_qa.font.bold = True
    p_qa.font.color.rgb = C_ACCENT

    p_git = tf.add_paragraph()
    p_git.text = "GitHub: github.com/Manoj-kanur/ML-Based-Query-Performance-Advisor"
    p_git.font.name = FONT_MONO
    p_git.font.size = Pt(9)
    p_git.font.color.rgb = C_BLUE

    # Save PowerPoint file
    print(f"Saving PowerPoint presentation to: {pptx_path}")
    prs.save(pptx_path)
    print("PowerPoint file saved successfully!")

    # Export to PDF via PowerPoint COM
    print(f"Exporting presentation to PDF via PowerPoint COM: {pdf_path}")
    try:
        import win32com.client
        ppt_app = win32com.client.Dispatch("PowerPoint.Application")
        deck = ppt_app.Presentations.Open(os.path.abspath(pptx_path))
        deck.SaveAs(os.path.abspath(pdf_path), 32) # 32 = ppSaveAsPDF
        deck.Close()
        ppt_app.Quit()
        print("Native vector PDF generated successfully!")
    except Exception as e:
        print(f"PowerPoint COM export error: {e}")

if __name__ == "__main__":
    pptx_out = r"c:\PESU\5TH SEM\DBMS\Mini-Project\presentation.pptx"
    pdf_out = r"c:\PESU\5TH SEM\DBMS\Mini-Project\presentation.pdf"
    build_presentation(pptx_out, pdf_out)
