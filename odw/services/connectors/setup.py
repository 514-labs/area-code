from setuptools import setup, find_packages

setup(
    name="connectors",
    version="0.0",
    package_dir={"connectors": "src"},
    packages=["connectors"],
    python_requires=">=3.12",
    install_requires=[
        # Add your dependencies here
    ],
)