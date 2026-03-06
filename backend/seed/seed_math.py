"""
PathFinder seed data — Mathematics vertical slice
Covers: Foundation (Layer 1) -> Domain (Layer 2) -> Professional (Layer 3) -> Outcome (Layer 4)
Run with: python -m seed.seed_math from the backend/ directory
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import Node

Base.metadata.create_all(bind=engine)

# ——— NODE DEFINITIONS ————————————————————————————————————————————————————
# Format: (id, display_name, summary, layer, subject_category,
#          mastery_threshold, time_estimate_hours, assessment_count, x, y)

NODES = [
    # ——— LAYER 1: FOUNDATION ————————————————————————————————————————————
    ("math_counting", "Counting & Number Sense",
     "Understanding that numbers represent quantities. Counting objects, recognizing numerals, understanding more and less.",
     1, "Mathematics", "Count to 20 accurately, identify written numerals", 10.0, 5, 100, 900),

    ("math_addition_basic", "Basic Addition",
     "Adding small numbers together. Understanding that addition combines quantities.",
     1, "Mathematics", "Add two single-digit numbers reliably", 15.0, 8, 200, 800),

    ("math_subtraction_basic", "Basic Subtraction",
     "Removing a quantity from another. The inverse of addition.",
     1, "Mathematics", "Subtract single-digit numbers reliably", 15.0, 8, 300, 800),

    ("math_multiplication", "Multiplication",
     "Repeated addition. Understanding times tables and their application.",
     1, "Mathematics", "Recall multiplication tables up to 12x12", 25.0, 12, 250, 700),

    ("math_division", "Division",
     "Splitting a quantity into equal parts. The inverse of multiplication.",
     1, "Mathematics", "Perform division with remainders accurately", 20.0, 10, 350, 700),

    ("math_fractions", "Fractions & Decimals",
     "Parts of a whole. Converting between fractions, decimals, and percentages.",
     1, "Mathematics", "Add, subtract, multiply and divide fractions", 30.0, 15, 300, 600),

    ("math_negative_numbers", "Negative Numbers & Integers",
     "Numbers below zero. Operations on the full number line.",
     1, "Mathematics", "Perform all operations with negative numbers", 20.0, 10, 200, 600),

    ("math_ratios", "Ratios & Proportional Reasoning",
     "Comparing quantities. Scaling up and down. Unit rates and percent.",
     1, "Mathematics", "Solve ratio and proportion problems in context", 25.0, 12, 400, 600),

    ("math_algebra1", "Algebra I",
     "Variables, expressions, and equations. Solving for unknowns. Linear relationships.",
     1, "Mathematics", "Solve linear equations and inequalities", 60.0, 20, 300, 500),

    ("math_geometry_basic", "Geometry — Foundations",
     "Shapes, angles, perimeter, area, and volume. Coordinate plane basics.",
     1, "Mathematics", "Calculate area/volume and work with coordinate plane", 50.0, 18, 150, 500),

    ("math_algebra2", "Algebra II",
     "Quadratic equations, polynomials, exponential functions, and systems of equations.",
     1, "Mathematics", "Solve quadratic and polynomial equations", 70.0, 22, 300, 400),

    ("math_statistics_basic", "Introductory Statistics",
     "Collecting and interpreting data. Mean, median, mode, distributions, and basic probability.",
     1, "Mathematics", "Interpret statistical summaries and basic probability", 40.0, 15, 500, 450),

    ("math_precalculus", "Precalculus",
     "Functions, trigonometry, vectors, and complex numbers. Bridge to calculus.",
     1, "Mathematics", "Graph and analyze all standard function families", 80.0, 25, 300, 300),

    ("math_calculus", "Calculus",
     "Limits, derivatives, and integrals. The mathematics of change and accumulation.",
     1, "Mathematics", "Compute derivatives and integrals of standard functions", 120.0, 30, 300, 200),

    ("math_quantitative_literacy", "Quantitative Literacy",
     "Applied mathematical reasoning for everyday decisions. Personal finance math, estimation, data interpretation.",
     1, "Mathematics", "Apply math reasoning to real-world quantitative problems", 30.0, 10, 550, 350),

    # ——— LAYER 2: DOMAIN ————————————————————————————————————————————————
    ("domain_linear_algebra", "Linear Algebra",
     "Vectors, matrices, transformations, and systems of linear equations. Foundation of machine learning and computer graphics.",
     2, "Mathematics", "Perform matrix operations and understand vector spaces", 90.0, 25, 200, 100),

    ("domain_differential_equations", "Differential Equations",
     "Equations relating functions and their derivatives. Models physical systems, population growth, and circuit behavior.",
     2, "Mathematics", "Solve first and second order differential equations", 100.0, 28, 350, 100),

    ("domain_probability_theory", "Probability Theory",
     "Formal mathematical treatment of uncertainty. Random variables, distributions, expected value.",
     2, "Mathematics", "Apply probability axioms and work with distributions", 80.0, 22, 500, 100),

    ("domain_discrete_math", "Discrete Mathematics",
     "Logic, sets, graph theory, combinatorics, and proof techniques. The mathematical foundation of computer science.",
     2, "Mathematics", "Write formal proofs and solve combinatorics problems", 80.0, 22, 650, 200),

    ("domain_statistical_inference", "Statistical Inference",
     "Hypothesis testing, confidence intervals, regression analysis, and Bayesian reasoning.",
     2, "Mathematics", "Design studies and interpret inferential statistics correctly", 100.0, 28, 550, 100),

    ("domain_numerical_methods", "Numerical Methods",
     "Algorithms for approximating solutions to mathematical problems computationally.",
     2, "Applied Sciences", "Implement and evaluate numerical algorithms", 80.0, 20, 150, 50),

    # ——— LAYER 3: PROFESSIONAL ——————————————————————————————————————————
    ("prof_data_analysis", "Data Analysis",
     "Cleaning, exploring, and summarizing datasets to extract actionable insight.",
     3, "Applied Sciences", "Produce and communicate analysis from raw data", 120.0, 15, 500, 0),

    ("prof_machine_learning", "Machine Learning",
     "Building systems that learn patterns from data. Supervised, unsupervised, and reinforcement learning.",
     3, "Applied Sciences", "Train, evaluate, and deploy ML models", 200.0, 20, 400, -80),

    ("prof_software_engineering", "Software Engineering",
     "Designing, building, and maintaining software systems. Algorithms, data structures, and system design.",
     3, "Applied Sciences", "Build and ship production-quality software", 300.0, 25, 200, -80),

    ("prof_financial_modeling", "Financial Modeling",
     "Quantitative models for pricing, risk, and investment decisions.",
     3, "Economics", "Build and validate financial models in spreadsheet and code", 150.0, 18, 650, -80),

    ("prof_actuarial_analysis", "Actuarial Analysis",
     "Mathematical assessment of financial risk using probability and statistics.",
     3, "Economics", "Pass initial actuarial exams (P and FM)", 200.0, 20, 750, 0),

    # ——— LAYER 4: OUTCOME ———————————————————————————————————————————————
    ("career_data_scientist", "Data Scientist",
     "Extracts insight from large datasets using statistics and machine learning. One of the fastest growing roles in the job market.",
     4, "Technology", "Portfolio of ML projects + statistical analysis + communication", None, None, 450, -180),

    ("career_software_engineer", "Software Engineer",
     "Designs and builds software systems. Broad role spanning web, mobile, systems, and infrastructure.",
     4, "Technology", "Deployed software projects demonstrating CS fundamentals", None, None, 200, -180),

    ("career_actuary", "Actuary",
     "Analyzes financial risk using mathematics and statistics. Primarily in insurance and finance.",
     4, "Finance", "Pass at least 2 actuarial society exams", None, None, 750, -180),

    ("career_quantitative_analyst", "Quantitative Analyst",
     "Applies mathematical models to financial markets. Works at hedge funds, banks, and trading firms.",
     4, "Finance", "Advanced mathematics + programming + financial domain knowledge", None, None, 600, -180),
]

# ——— EDGE DEFINITIONS ————————————————————————————————————————————————————
# Format: (node_id, prerequisite_id)
# Read as: node_id REQUIRES prerequisite_id

PREREQUISITES = [
    # Foundation chain
    ("math_addition_basic", "math_counting"),
    ("math_subtraction_basic", "math_counting"),
    ("math_multiplication", "math_addition_basic"),
    ("math_multiplication", "math_subtraction_basic"),
    ("math_division", "math_multiplication"),
    ("math_fractions", "math_division"),
    ("math_negative_numbers", "math_subtraction_basic"),
    ("math_ratios", "math_fractions"),
    ("math_algebra1", "math_negative_numbers"),
    ("math_algebra1", "math_ratios"),
    ("math_geometry_basic", "math_algebra1"),
    ("math_algebra2", "math_algebra1"),
    ("math_statistics_basic", "math_ratios"),
    ("math_precalculus", "math_algebra2"),
    ("math_precalculus", "math_geometry_basic"),
    ("math_calculus", "math_precalculus"),
    ("math_quantitative_literacy", "math_statistics_basic"),
    ("math_quantitative_literacy", "math_ratios"),

    # Domain layer
    ("domain_linear_algebra", "math_calculus"),
    ("domain_differential_equations", "math_calculus"),
    ("domain_probability_theory", "math_statistics_basic"),
    ("domain_probability_theory", "math_algebra2"),
    ("domain_discrete_math", "math_algebra1"),
    ("domain_statistical_inference", "domain_probability_theory"),
    ("domain_numerical_methods", "domain_linear_algebra"),
    ("domain_numerical_methods", "domain_differential_equations"),

    # Professional layer
    ("prof_data_analysis", "domain_statistical_inference"),
    ("prof_data_analysis", "math_statistics_basic"),
    ("prof_machine_learning", "domain_linear_algebra"),
    ("prof_machine_learning", "domain_statistical_inference"),
    ("prof_software_engineering", "domain_discrete_math"),
    ("prof_financial_modeling", "domain_statistical_inference"),
    ("prof_financial_modeling", "math_calculus"),
    ("prof_actuarial_analysis", "domain_probability_theory"),
    ("prof_actuarial_analysis", "domain_statistical_inference"),

    # Career outcomes
    ("career_data_scientist", "prof_data_analysis"),
    ("career_data_scientist", "prof_machine_learning"),
    ("career_software_engineer", "prof_software_engineering"),
    ("career_actuary", "prof_actuarial_analysis"),
    ("career_quantitative_analyst", "prof_financial_modeling"),
    ("career_quantitative_analyst", "prof_machine_learning"),
]

def seed():
    db = SessionLocal()
    try:
        # Clear existing data
        db.execute(Node.__table__.delete())
        db.commit()

        # Insert nodes
        node_map = {}
        for (id_, name, summary, layer, category,
             mastery, hours, assessments, x, y) in NODES:
            node = Node(
                id=id_,
                display_name=name,
                summary=summary,
                layer=layer,
                subject_category=category,
                mastery_threshold=mastery,
                time_estimate_hours=hours,
                assessment_count=assessments,
                x=x,
                y=y,
            )
            db.add(node)
            node_map[id_] = node
        db.commit()

        # Reload nodes fresh from DB
        node_map = {n.id: n for n in db.query(Node).all()}

        # Insert prerequisite edges
        for (node_id, prereq_id) in PREREQUISITES:
            node = node_map.get(node_id)
            prereq = node_map.get(prereq_id)
            if node and prereq:
                if prereq not in node.prerequisites:
                    node.prerequisites.append(prereq)

        db.commit()
        print(f"Seeded {len(NODES)} nodes and {len(PREREQUISITES)} edges successfully.")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
